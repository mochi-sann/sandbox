
import socket 
host = "localhost" 
port = 10007

soc = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
soc.bind((host, port))

print("ready")

while True: 
    data , peer = soc.recvfrom(4096)
    print(peer , data.decode())
    soc.sendto(data, peer)


soc.close()
