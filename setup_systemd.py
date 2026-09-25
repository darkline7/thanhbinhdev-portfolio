import paramiko

HOST = '160.191.244.254'
USER = 'root'
PASS = 'eQtINpOrXR$z'

def run_cmd(client, cmd, timeout=60):
    print(f'>>> {cmd}')
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out)
    if err: print(f'STDERR: {err}')
    print()

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Create systemd service
service_content = """[Unit]
Description=ThanhBinhDev Portfolio
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/thanhbinhdev
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment=PORT=3456
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=thanhbinhdev

[Install]
WantedBy=multi-user.target
"""

run_cmd(client, f'cat > /etc/systemd/system/thanhbinhdev.service << \'ENDOFSERVICE\'\n{service_content}ENDOFSERVICE')
run_cmd(client, 'fuser -k 3456/tcp 2>/dev/null || true')
run_cmd(client, 'systemctl daemon-reload')
run_cmd(client, 'systemctl enable thanhbinhdev')
run_cmd(client, 'systemctl start thanhbinhdev')
run_cmd(client, 'sleep 2 && systemctl status thanhbinhdev --no-pager')
run_cmd(client, 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3456/')

client.close()
print("Systemd service created and started!")