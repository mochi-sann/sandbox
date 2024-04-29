
import socket 
host = "localhost" 
port = 10007

soc = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
soc.bind((host, port))

print("ready")

while True: 
    data , peer = soc.recvfrom(4096)
    print(peer , data.decode())
    soc.sendto(data, peer)


soc.close()
# import socket
#
# # UDP ソケットを作成
# sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
#
# # ソケットを特定の IP アドレスとポートにバインド
# server_address = ('localhost', 10000)  # 適切な IP とポートに置き換えてください
# sock.bind(server_address)
#
# print('Listening on {}'.format(sock.getsockname()))
#
# while True:
#     data, peer = sock.recvfrom(4096)  # 受信バッファサイズ 4096 バイト
#     print('Received {} bytes from {}'.format(len(data), peer))
#     print(data.decode())
#
#     # クライアントに応答を返す場合
#     sock.sendto(b'Hello from server', peer)
#
