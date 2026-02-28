import WebSocket, {WebSocketServer} from "ws"
import jwt from "jsonwebtoken"

interface ExtendedWebSocket extends WebSocket {
    businessId?:number;
    userId?: number;
}

let wss:WebSocketServer;

export const initialize= (webSocketServer: WebSocketServer)=>{
    wss = webSocketServer;

    wss.on("connection", (ws:ExtendedWebSocket, req)=>{
        try{
            const url= new URL(req.url!, `http://${req.headers.host}`);
            const token= url.searchParams.get("token");

            if(!token){
                ws.close();
                return;
            }

            const decoded:any = jwt.verify(
               token,
               process.env.JWT_SECRET as string 
            );

            ws.businessId= decoded.businessId;
            ws.userId = decoded.userId;
        }catch{
            ws.close();
            return;
        }

        ws.on("message", (data)=>{
            try{
                const message= JSON.parse(data.toString());

                if(message.type === "PING"){
                    ws.send(JSON.stringify({type:"PONG"}));
                }
            }catch{

            }
        });
    });
};

export const broadcastToBusiness= (
    businessId:number,
    message: any
)=>{
    if(!wss) return;

    const messageStr= JSON.stringify(message);

    wss.clients.forEach((client)=>{
        const ws= client as ExtendedWebSocket;

        if(
            ws.readyState === WebSocket.OPEN &&
            ws.businessId === businessId
        ){
            ws.send(messageStr);
        }
    });
};