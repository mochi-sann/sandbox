
import socket 
host = "localhost" 
port = 10007

soc = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
soc.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
soc.bind((host, port))
soc.listen(128)


while True: 

    print ("Waiting for connection...")
    new_soc, peer = soc.accept()
    print ("Connected from", peer)
    while True:
        data = new_soc.recv(4096)
        if data == b'':
            print("Disconnected")
            new_soc.close()

            break
        print(peer , data.decode())
        new_soc.send(data)

soc.close()
