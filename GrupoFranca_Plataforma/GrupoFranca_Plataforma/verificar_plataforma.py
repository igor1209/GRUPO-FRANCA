"""Read-only consistency checks. Never logs personal fields or connects external services."""
import argparse
import json
import os
from pathlib import Path
import sqlite3

PERMISSIONS={'create','edit','move','message','book','import','cadence'}
STAGES={'new','contacted','qualified','meeting','proposal','won','lost'}


def verify(path):
    checks=[]
    def add(name,ok,detail='',warning=False):
        checks.append({'check':name,'status':'ok' if ok else ('warning' if warning else 'failed'),'detail':detail})
    if not path.is_file():
        add('Banco existente',False,'Inicie a plataforma com a pasta de dados correta antes de verificar.')
        return checks
    db=sqlite3.connect(path.resolve().as_uri()+'?mode=ro',uri=True,timeout=10)
    db.row_factory=sqlite3.Row
    try:
        db.execute('BEGIN')
        tables={r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        expected={'team_users','team_assignments','team_stages','leads','meetings','gf_calendar','wa_connections'}
        missing=expected-tables
        add('Estrutura da plataforma',not missing,'Tabelas ausentes: '+', '.join(sorted(missing)) if missing else '')
        if missing:return checks
        add('Integridade SQLite',all(r[0]=='ok' for r in db.execute('PRAGMA quick_check')))
        add('Referências entre registros',not db.execute('PRAGMA foreign_key_check').fetchone())
        managers=db.execute("SELECT count(*) FROM team_users WHERE role='manager' AND active=1").fetchone()[0]
        add('Gerente ativo',managers==1,'Quantidade: '+str(managers))
        sellers=db.execute("SELECT count(*) FROM team_users WHERE role='seller' AND active=1").fetchone()[0]
        add('Vendedores ativos',sellers>0,'Quantidade: '+str(sellers),warning=True)
        unassigned=db.execute('SELECT count(*) FROM leads l LEFT JOIN team_assignments a ON a.lead_id=l.id WHERE a.lead_id IS NULL').fetchone()[0]
        add('Carteiras atribuídas',unassigned==0,'Contatos sem responsável: '+str(unassigned))
        inactive=db.execute('SELECT count(*) FROM team_assignments a JOIN team_users u ON u.id=a.user_id WHERE u.active=0').fetchone()[0]
        add('Carteiras de usuários ativos',inactive==0,'Contatos com responsável inativo: '+str(inactive),warning=True)
        invalid=0
        for row in db.execute('SELECT permissions FROM team_users'):
            try:
                value=json.loads(row[0])
                if not isinstance(value,list) or any(p not in PERMISSIONS for p in value):invalid+=1
            except (ValueError,TypeError):invalid+=1
        add('Permissões reconhecidas',invalid==0,'Registros inválidos: '+str(invalid))
        invalid_stages=sum(1 for row in db.execute('SELECT stage FROM team_stages') if row[0] not in STAGES)
        add('Etapas comerciais reconhecidas',invalid_stages==0)
        conflicts=db.execute('''SELECT count(*) FROM meetings a JOIN meetings b ON a.id<b.id
            AND a.active=1 AND b.active=1 AND a.start<b.end AND a.end>b.start''').fetchone()[0]
        add('Reservas sem sobreposição',conflicts==0,'Conflitos locais: '+str(conflicts))
        return checks
    finally:db.close()


def main():
    default=Path(os.getenv('GF_SDR_DATA_DIR') or Path(os.getenv('LOCALAPPDATA',str(Path.home())))/'GrupoFrancaSDR')/'sdr.sqlite3'
    parser=argparse.ArgumentParser(description='Verificar a consistência da plataforma sem alterar dados.')
    parser.add_argument('--banco',type=Path,default=default)
    args=parser.parse_args()
    try:checks=verify(args.banco)
    except (sqlite3.Error,OSError):
        print('Não foi possível verificar o banco. Confira o acesso e tente com a plataforma fechada.')
        return 1
    for item in checks:
        label={'ok':'OK','warning':'ATENÇÃO','failed':'FALHA'}[item['status']]
        print(f"[{label}] {item['check']}"+(f" — {item['detail']}" if item['detail'] else ''))
    print('\nVerificação interna concluída. O teste não acessa WhatsApp ou Google e não substitui o teste de login de vendedor.')
    return int(any(item['status']=='failed' for item in checks))


if __name__=='__main__':raise SystemExit(main())
