
import { ClientDetail } from './../Client/Shared/ClientDetail';
import { IQuote, Quote, Order, Fill } from './../Client/Shared/Entities/Quote';
import { Side, ClientType } from './../Client/Shared/Entities/Enums';
import { LoginResponse } from './../Client/Shared/Responses/LoginResponse';

import { ClientData } from './Entities/ClientData';
import { MatchingService } from './Matching/MatchingService';
import { MarketDataService } from './MarketDataService/MarketDataService';
import { IEventMessage, ServerSocketService } from './ServerSocketService';



export class StockServer {
    Clients: { [SocketId: string]: ClientData };
    Users: string[] = new Array<string>();
    UserToSocketIdMap: { [User: string]: string };
    SocketService: ServerSocketService;
    marketDataService: MarketDataService;
    matcher: MatchingService;
    private runningId: number = 0;

    constructor(socketService: ServerSocketService, marketDataService: MarketDataService) {
        this.SocketService = socketService;
        this.marketDataService = marketDataService;
        this.SocketService.OnMessage.on((a) => this.OnMessageReceived(a))
        this.matcher = new MatchingService(marketDataService, this);
        this.Clients = {};
        this.UserToSocketIdMap = {};
    }

    OnMessageReceived(eMsg: IEventMessage) {
        if (eMsg.MessageType !== 'login' && this.Clients[eMsg.SocketId] === undefined) {
            this.SocketService.SendMessage(eMsg.SocketId, 'relogin', 'Connection lost, please try logging again.');
            return;
        }
        else {

        }
        switch (eMsg.MessageType) {
            case 'login':
                this.OnLoginRequested(eMsg);
                break;
            case 'GetOrders':
                this.OnGetOrdersReceived(eMsg);
                break;
            case 'quote':
                this.OnQuoteReceived(eMsg);
                break;
            case 'CancelOrder':
                this.OnCancelReceived(eMsg);
                break;
            default:
                break;
        }
    }

    OnLoginRequested = (eMsg: IEventMessage) => {

        let c: ClientDetail = JSON.parse(eMsg.Message);
        if (c.Type === ClientType.MarketMaker)
            console.log('Market maker log in request');

        let clientData: ClientData = new ClientData();
        clientData.SocketId = eMsg.SocketId;
        clientData.User = c.User;
        clientData.Type = c.Type;

        this.ValidateUser(c.User, eMsg.SocketId);

        this.Clients[clientData.SocketId] = clientData;
        this.UserToSocketIdMap[c.User] = eMsg.SocketId;
        let loginResp: LoginResponse = new LoginResponse();
        loginResp.Status = 'success';
        loginResp.ConnectionId = clientData.SocketId;
        loginResp.User = clientData.User;
        this.SendMessage(c.User, 'loginStatus', loginResp);
    }

    OnQuoteReceived = (eMsg: IEventMessage) => {
        let quote: IQuote = JSON.parse(eMsg.Message);
        let user = this.Clients[eMsg.SocketId].User;
        if (user) {
            quote.Id = this.runningId++;
            quote.User = user;

            this.matcher.Add(quote);
        }
    }

    OnCancelReceived = (eMsg: IEventMessage) => {
        let cancel: { Id: number, Symbol: string } = JSON.parse(eMsg.Message);
        this.matcher.CancelOrder(cancel);
    }

    OnGetOrdersReceived = (eMsg: IEventMessage) => {
        let user = this.Clients[eMsg.SocketId].User;
        let orders: Order[] = [];
        setTimeout(() => {
            this.matcher.SymbolOrdersMap.forEach(element => {
                orders = orders.concat(element.BuyOrders.filter(o => o.User == user));
                orders = orders.concat(element.SellOrders.filter(o => o.User == user));
                orders = orders.concat(element.MatchOrders.filter(o => o.User == user));
                orders = orders.concat(element.CancelOrders.filter(o => o.User == user));
            });
            this.SendMessage(user, 'GetOrdersResponse', orders);
        }, 0);

        setTimeout(() => {
            this.marketDataService.SendMarketDataTo(eMsg.SocketId);
        }, 0);

    }

    ValidateUser(user: string, originSocketId: string): boolean {
        if (user === null || user === undefined)
            this.SocketService.SendMessage(originSocketId, 'relogin', 'Login Failed.' )
            return false;
            let socketId = this.UserToSocketIdMap[user];
        if (socketId === undefined)
            return true;
        else{
            this.SocketService.SendMessage(socketId, 'relogin', 'Session has been disconnected as you have logged in elsewhere' )
            return false;
        }
        return false;
    }

    Start() {
        this.SocketService.Start();
    }

    SendUpdate = (order: Order) => {
        this.SendMessage(order.User, 'StockUpdate', order);
    }

    SendMessage(user: string, event: string, obj: any) {
        let exist = this.UserToSocketIdMap[user];
        if (exist)
            this.SocketService.SendMessage(exist, event, obj);
        else
            console.log('User not logged in');

    }


}


var socketService: ServerSocketService = new ServerSocketService();
var marketDataService = new MarketDataService(socketService);
var server: StockServer = new StockServer(socketService, marketDataService);
server.Start();


//       {"Symbol": "INFY", "Last": 1080},
//    {"Symbol": "WIPRO", "Last": 550},
//    {"Symbol": "TECHM", "Last": 500},
//    {"Symbol": "HCLTECH", "Last": 830}
// ]
