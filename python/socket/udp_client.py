
import socket 
host = "localhost" 
port = 10007



soc = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

while True : 
    data = input(" > ")
    if data == "" :
        soc.close()


        break
    soc.sendto(data.encode(), (host, port))
    data , peer = soc.recvfrom(4096)
    print(peer , data.decode())

