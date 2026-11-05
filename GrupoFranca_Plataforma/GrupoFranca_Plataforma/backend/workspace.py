import json
from datetime import timedelta
from .core import Store, now

class WorkspaceStore(Store):
    """Additive tables keep the desktop database compatible."""
    def __init__(self, path):
        super().__init__(path)
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS lead_meta (
            lead_id INTEGER PRIMARY KEY REFERENCES leads(id), tags TEXT NOT NULL DEFAULT '',
            owner TEXT NOT NULL DEFAULT 'Igor França');
        CREATE TABLE IF NOT EXISTS cadences (
            id INTEGER PRIMARY KEY, name TEXT NOT NULL, steps TEXT NOT NULL, created TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS cadence_runs (
            id INTEGER PRIMARY KEY, lead_id INTEGER NOT NULL REFERENCES leads(id),
            cadence_id INTEGER NOT NULL REFERENCES cadences(id), step INTEGER NOT NULL DEFAULT 0,
            due TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active');
        CREATE UNIQUE INDEX IF NOT EXISTS uq_run_active ON cadence_runs(lead_id) WHERE status='active';
        """)

    def workspace(self):
        return {
            'meta': {str(r['lead_id']): dict(r) for r in self.db.execute('SELECT * FROM lead_meta')},
            'cadences': [dict(r) for r in self.db.execute('SELECT * FROM cadences ORDER BY id DESC')],
            'runs': [dict(r) for r in self.db.execute('SELECT * FROM cadence_runs ORDER BY due')],
            'history': [dict(r) for r in self.db.execute("SELECT m.*,l.name,l.company,l.contact FROM messages m JOIN leads l ON l.id=m.lead_id ORDER BY m.id DESC LIMIT 2000")],
            'usage': [dict(r) for r in self.db.execute('SELECT * FROM usage ORDER BY id DESC LIMIT 1000')],
        }

    def workspace_action(self, data):
        action = data.get('action')
        if action == 'cadence_save':
            name = str(data.get('name', '')).strip()
            steps = data.get('steps', [])
            if not name or len(name)>120 or not isinstance(steps,list) or not 1<=len(steps)<=20:
                raise ValueError('Informe um nome e de 1 a 20 etapas.')
            clean=[]
            for step in steps:
                if not isinstance(step, dict): raise ValueError('Etapa inválida.')
                kind=step.get('kind')
                hours=int(step.get('hours',0))
                text=str(step.get('text','')).strip()
                if kind not in ('task','wait','message') or not 0<=hours<=720 or len(text)>4000 or (kind!='wait' and not text):
                    raise ValueError('Confira o tipo, texto e prazo das etapas.')
                clean.append({'kind':kind,'hours':hours,'text':text})
            with self.db:
                self.db.execute('INSERT INTO cadences(name,steps,created) VALUES (?,?,?)',(name,json.dumps(clean,ensure_ascii=False),now().isoformat()))
            return {'ok':True}
        lid=int(data.get('id',0))
        lead=self.lead(lid)
        if not lead: raise ValueError('Selecione um contato válido.')
        if action == 'profile':
            from .core import contact_key
            values={k:str(data.get(k,lead[k])).strip() for k in ('name','company','contact','origin','target')}
            if not (values['name'] or values['company']) or any(len(v)>160 for v in values.values()) or values['origin'] not in ('Inbound','Outbound') or values['target'] not in ('B2B','B2C','Ambos'):
                raise ValueError('Confira o cadastro do contato.')
            tags=str(data.get('tags','')).strip()[:300]
            owner=str(data.get('owner','Igor França')).strip()[:100]
            values['contact_key']=contact_key(values['contact'])
            self.update(lid,**values)
            with self.db:
                self.db.execute('INSERT OR REPLACE INTO lead_meta VALUES (?,?,?)',(lid,tags,owner))
        elif action == 'block':
            if lead['blocked']: raise ValueError('Este contato já está bloqueado.')
            self.update(lid,blocked=1,paused=1,phase='stopped',followup='')
            with self.db:
                self.db.execute("UPDATE cadence_runs SET status='cancelled' WHERE lead_id=? AND status='active'",(lid,))
            self.message(lid,'human','Contato incluído na lista de não contatar.','Operação interna')
        elif action == 'cadence_assign':
            if lead['blocked'] or lead['paused']: raise ValueError('Contato pausado ou bloqueado.')
            cid=int(data.get('cadence',0))
            row=self.db.execute('SELECT * FROM cadences WHERE id=?',(cid,)).fetchone()
            if not row: raise ValueError('Cadência não encontrada.')
            first=json.loads(row['steps'])[0]
            due=(now()+timedelta(hours=first['hours'])).isoformat()
            with self.db:
                self.db.execute('INSERT INTO cadence_runs(lead_id,cadence_id,due) VALUES (?,?,?)',(lid,cid,due))
        elif action in ('cadence_next','cadence_cancel'):
            row=self.db.execute("SELECT r.*,c.steps FROM cadence_runs r JOIN cadences c ON c.id=r.cadence_id WHERE r.lead_id=? AND r.status='active'",(lid,)).fetchone()
            if not row: raise ValueError('Sem cadência ativa.')
            if action=='cadence_cancel':
                with self.db: self.db.execute("UPDATE cadence_runs SET status='cancelled' WHERE id=?",(row['id'],))
            else:
                if lead['blocked'] or lead['paused']: raise ValueError('Retome o contato antes de concluir uma etapa.')
                steps=json.loads(row['steps'])
                if steps[row['step']]['kind']=='wait' and row['due']>now().isoformat(): raise ValueError('O prazo desta espera ainda não terminou.')
                nxt=row['step']+1
                with self.db:
                    self.db.execute('UPDATE cadence_runs SET step=?,status=?,due=? WHERE id=?',(nxt,'done' if nxt>=len(steps) else 'active',(now()+timedelta(hours=steps[nxt]['hours'] if nxt<len(steps) else 0)).isoformat(),row['id']))
                self.message(lid,'human',f"Etapa {nxt} da cadência concluída manualmente.",'Cadência local')
        else: raise ValueError('Ação inválida.')
        return {'ok':True}

