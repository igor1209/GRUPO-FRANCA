"""Start the compiled React UI and API together, on localhost only."""
from pathlib import Path
import socket
import threading
import webbrowser
import uvicorn

if __name__ == '__main__':
    if not (Path(__file__).parent/'frontend/dist/index.html').exists():
        raise SystemExit('Execute configurar.bat primeiro para compilar a interface.')
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1',8780))==0:
            raise SystemExit('Porta 8780 em uso. Feche a outra instancia ou abra http://127.0.0.1:8780')
    def open_when_ready():
        for _ in range(60):
            with socket.socket() as check:
                if check.connect_ex(('127.0.0.1',8780))==0:
                    webbrowser.open('http://127.0.0.1:8780')
                    return
            threading.Event().wait(.5)
    threading.Thread(target=open_when_ready,daemon=True).start()
    uvicorn.run('backend.main:app',host='127.0.0.1',port=8780,log_level='info')
