import * as appCreator from 'express';
const app = appCreator();

import httpCreator = require('http');
const http = httpCreator.Server(app);

import ioCreator = require('socket.io');
const io = ioCreator(http);

import { LiteEvent, ILiteEvent } from './LiteEvent';

export interface IEventMessage {
    SocketId: string;
    MessageType: string;
    Message: string;
}
export class EventMessage {
    SocketId: string;
    MessageType: string;
    Message: string;
}

export class ServerSocketService {

    IO = io;
    Socket: any;

    private onMessage = new LiteEvent<EventMessage>();
    public get OnMessage(): ILiteEvent<IEventMessage> { return this.onMessage; }

    Broadcast(eventType: string, obj: any){
        this.IO.emit(eventType, JSON.stringify(obj));
    }

    SendMessage(socketId: string, eventType: string, obj: any) {
        this.IO.to(socketId).emit(eventType, JSON.stringify(obj));
    }

    RaiseEvent(type: string, message: string, socketId: string) {
        //console.log('SocketId: ' + socketId + 'Type: ' + type + 'Message: ' + message);
        let eMsg: IEventMessage = { MessageType: type, Message: message, SocketId: socketId };
        this.onMessage.trigger(eMsg);
    }

    Start() {
        let service = this;
        io.on('connection', (socket) => {
            console.log('a user connected');
            let socketId = socket.id;
            socket.on('login', (msg: string) => { this.RaiseEvent('login', msg, socketId); });
            socket.on('quote', (msg: string) => { this.RaiseEvent('quote', msg, socketId); });
            socket.on('GetOrders', (msg: string) => { this.RaiseEvent('GetOrders', msg, socketId); });
            socket.on('CancelOrder', (msg: string) => { this.RaiseEvent('CancelOrder', msg, socketId); });

            socket.on('disconnect', function () { console.log('user disconnected');});
            });


        http.listen(3002, function () {
            console.log('listening on *:3002');
        });
    }
}