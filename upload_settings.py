import paramiko
import os

host = '127.0.0.1'
port = 2222
username = 'sgssa'
password = 'admin'

local_path = r'c:\Users\hpi7\Desktop\SGSSA\backend\sgssa\settings.py'
remote_path = '/home/sgssa/SGSSA/backend/sgssa/settings.py'

print(f"Connecting to {host}:{port} as {username}...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(host, port=port, username=username, password=password, timeout=10)
    print("Connected successfully!")
    
    print("Uploading file...")
    sftp = ssh.open_sftp()
    sftp.put(local_path, remote_path)
    sftp.close()
    print("Upload complete!")
    
    print("Restarting Docker backend container...")
    stdin, stdout, stderr = ssh.exec_command('cd /home/sgssa/SGSSA && echo admin | sudo -S docker compose down && sudo docker compose up -d --build')
    
    exit_status = stdout.channel.recv_exit_status()
    print(f"Docker compose exit status: {exit_status}")
    print("STDOUT:", stdout.read().decode())
    print("STDERR:", stderr.read().decode())
    
except Exception as e:
    print(f"Error: {e}")
finally:
    ssh.close()
