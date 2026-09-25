import paramiko
import time

HOST = '160.191.244.254'
USER = 'root'
PASS = 'eQtINpOrXR$z'
REPO = 'https://github.com/darkline7/thanhbinhdev-portfolio.git'
DEPLOY_DIR = '/var/www/thanhbinhdev'
PORT = 3456

def run_cmd(client, cmd, timeout=60):
    print(f'>>> {cmd}')
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out)
    if err: print(f'STDERR: {err}')
    print()
    return exit_code

def run_bg(client, cmd):
    """Run command without waiting for exit (for background daemons)."""
    print(f'>>> [BG] {cmd}')
    client.exec_command(cmd)
    print()

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

print("="*50)
print("DEPLOYING THANHBINHDEV PORTFOLIO")
print("="*50)

run_cmd(client, 'which node && node --version')
run_cmd(client, f'fuser -k {PORT}/tcp 2>/dev/null || true')
run_cmd(client, f'rm -rf {DEPLOY_DIR}')
run_cmd(client, f'git clone {REPO} {DEPLOY_DIR}')
run_cmd(client, f'cd {DEPLOY_DIR} && ls -la')

# Start server — fire and forget
run_bg(client, f'cd {DEPLOY_DIR} && PORT={PORT} nohup node server.js > /var/log/thanhbinhdev.log 2>&1 &')

time.sleep(3)

# Reconnect to check (previous connection might be stale)
client2 = paramiko.SSHClient()
client2.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client2.connect(HOST, username=USER, password=PASS, timeout=30)

run_cmd(client2, f'curl -s -o /dev/null -w "%{{http_code}}" http://localhost:{PORT}/')
run_cmd(client2, f'cat /var/log/thanhbinhdev.log')

client.close()
client2.close()

print("="*50)
print(f"DONE! Visit: http://{HOST}:{PORT}")
print("="*50)
