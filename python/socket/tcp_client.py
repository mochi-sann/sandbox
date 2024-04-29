
import socket 
host = "localhost" 
port = 10007



soc = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
soc.connect((host, port))
print("Connected to server")

while True : 
    data = input(" > ")
    if data == "" :
        soc.close()


        break
    soc.send(data.encode())
    data = soc.recv(4096)
    print("data : " , data.decode())
