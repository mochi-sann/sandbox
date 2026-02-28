const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

type SignalSender = (toPlayerId: string, signalType: "offer" | "answer" | "ice", data: RTCSessionDescriptionInit | RTCIceCandidateInit) => void;

type MessageHandler = (fromPlayerId: string, message: unknown) => void;

type OpenHandler = (peerId: string) => void;

export class WebRtcManager {
  private readonly isHost: boolean;
  private readonly peers = new Map<string, RTCPeerConnection>();
  private readonly channels = new Map<string, RTCDataChannel>();
  private readonly signalSender: SignalSender;
  private onMessage?: MessageHandler;
  private onOpen?: OpenHandler;

  constructor(isHost: boolean, signalSender: SignalSender) {
    this.isHost = isHost;
    this.signalSender = signalSender;
  }

  setHandlers(onMessage: MessageHandler, onOpen: OpenHandler): void {
    this.onMessage = onMessage;
    this.onOpen = onOpen;
  }

  async hostCreatePeer(peerId: string): Promise<void> {
    if (!this.isHost || this.peers.has(peerId)) {
      return;
    }

    const pc = this.newPeer(peerId);
    const channel = pc.createDataChannel("game");
    this.bindChannel(peerId, channel);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.signalSender(peerId, "offer", offer);
  }

  async handleSignal(fromPlayerId: string, signalType: "offer" | "answer" | "ice", data: RTCSessionDescriptionInit | RTCIceCandidateInit): Promise<void> {
    let pc = this.peers.get(fromPlayerId);

    if (!pc) {
      pc = this.newPeer(fromPlayerId);
    }

    if (signalType === "offer") {
      await pc.setRemoteDescription(data as RTCSessionDescriptionInit);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.signalSender(fromPlayerId, "answer", answer);
      return;
    }

    if (signalType === "answer") {
      await pc.setRemoteDescription(data as RTCSessionDescriptionInit);
      return;
    }

    if (signalType === "ice") {
      await pc.addIceCandidate(data as RTCIceCandidateInit);
    }
  }

  sendToPeer(peerId: string, payload: unknown): void {
    const channel = this.channels.get(peerId);
    if (!channel || channel.readyState !== "open") {
      return;
    }
    channel.send(JSON.stringify(payload));
  }

  broadcast(payload: unknown): void {
    for (const [peerId] of this.channels) {
      this.sendToPeer(peerId, payload);
    }
  }

  closePeer(peerId: string): void {
    this.channels.get(peerId)?.close();
    this.peers.get(peerId)?.close();
    this.channels.delete(peerId);
    this.peers.delete(peerId);
  }

  private newPeer(peerId: string): RTCPeerConnection {
    const existing = this.peers.get(peerId);
    if (existing) {
      return existing;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalSender(peerId, "ice", event.candidate.toJSON());
      }
    };

    if (!this.isHost) {
      pc.ondatachannel = (event) => {
        this.bindChannel(peerId, event.channel);
      };
    }

    this.peers.set(peerId, pc);
    return pc;
  }

  private bindChannel(peerId: string, channel: RTCDataChannel): void {
    this.channels.set(peerId, channel);

    channel.onopen = () => {
      this.onOpen?.(peerId);
    };

    channel.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        this.onMessage?.(peerId, parsed);
      } catch {
        // Ignore malformed payloads
      }
    };

    channel.onclose = () => {
      this.channels.delete(peerId);
    };
  }
}
