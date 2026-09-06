#!/usr/bin/env python3
from pathlib import Path
import re

p = Path("/etc/nginx/sites-enabled/petdate")
t = p.read_text()

# Remove temporary stream probe locations
t = re.sub(r"\n  location = /api/stream/chat \{[\s\S]*?\n  \}\n", "\n", t)

# Remove all existing /api/ws/ blocks (with or without comment)
t = re.sub(
    r"\n  # WebSocket chat live updates\n  location /api/ws/ \{[\s\S]*?\n  \}\n",
    "\n",
    t,
)
t = re.sub(r"\n  location /api/ws/ \{[\s\S]*?\n  \}\n", "\n", t)

ws = """
  # WebSocket chat live updates
  location /api/ws/ {
    proxy_pass http://127.0.0.1:3001/api/ws/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $forwarded_proto;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    proxy_buffering off;
  }
"""

t = t.replace("  location /api/ {", ws + "\n  location /api/ {")
p.write_text(t)
print("ws blocks", t.count("location /api/ws/"))
print("stream blocks", t.count("/api/stream/chat"))
