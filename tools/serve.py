#!/usr/bin/env python3
"""Development server for Casebook: serves the folder on every network interface (so phones on the same
Wi-Fi can open it) and tells browsers never to cache, so edits always show up on refresh.

    python3 tools/serve.py            # http://localhost:5191 and http://<your-LAN-IP>:5191
    python3 tools/serve.py 8080       # another port
"""
import http.server, os, socketserver, sys
import mimetypes
mimetypes.add_type('application/manifest+json', '.webmanifest')   # so browsers accept the app manifest

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5191
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


class NoCache(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == '__main__':
    with Server(('0.0.0.0', PORT), NoCache) as httpd:
        print(f'Casebook on http://localhost:{PORT} (no caching)')
        httpd.serve_forever()
