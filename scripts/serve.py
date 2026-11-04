"""Servidor local do jogo para desenvolvimento e testes.

    python scripts/serve.py [porta] [pasta]

O "python -m http.server" aceita só 5 conexões na fila: com as ~150 artes em
feltro carregando juntas no começo, o navegador levava "conexão recusada" e o
jogo abria pela metade (testes instáveis). Este é o mesmo servidor, com
threads e fila grande, e com os tipos certos de .js e .webp.
"""
import functools
import http.server
import os
import sys


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 256
    daemon_threads = True


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".js": "text/javascript", ".webp": "image/webp", ".json": "application/json"}

    def log_message(self, *args):
        pass


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    root = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    handler = functools.partial(Handler, directory=root)
    with Server(("127.0.0.1", port), handler) as httpd:
        print(f"Casa da Nubi em http://127.0.0.1:{port}/", flush=True)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
