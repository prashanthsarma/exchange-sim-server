import {OrderList} from './OrderList'
import { IQuote, Order, OrderType, ExecutionType, Fill } from './../../Client/Shared/Entities/Quote';
import { IMarketData, MarketData } from './../../Client/Shared/Entities/MarketData';
import { ServerSocketService } from './../ServerSocketService'
import * as fs from'fs'



export enum PriceType { Ask, Bid, Last, PreviousClose, Open }

export class MarketDataService {
    private SymbolMarketData: { [Symbol: string]: MarketData };
    socketService: ServerSocketService
    constructor(socketService: ServerSocketService) {
        this.socketService = socketService;
        let data: IMarketData[] = JSON.parse(fs.readFileSync('./Symbol.json', 'utf8'));
        this.SymbolMarketData = {};
        data.forEach(element => {
            let md: MarketData = new MarketData();
            md.Ask = element.Ask;
            md.Bid = element.Bid;
            md.Last = element.Last;
            this.SymbolMarketData[element.Symbol] = md;
        });
    }

    Change(symbol: string, priceType: PriceType, price: number) {
        let symMarketData = this.SymbolMarketData[symbol];
        switch (priceType) {
            case PriceType.Ask:
                symMarketData.Ask = price;
                break;
            case PriceType.Bid:
                symMarketData.Bid = price;
                break;
            case PriceType.Last:
                symMarketData.Last = price;
                break;
            default:
                break;
        }
        setTimeout(() => {
            let md: IMarketData = symMarketData;
            md.Symbol = symbol;
            this.socketService.Broadcast('MarketUpdate', md);
        }, 0);
    }

    LastPrice(symbol: string): number {
        return this.SymbolMarketData[symbol].Last;
    }

    SendMarketDataTo(socketId: string) {
        for (var symbol in this.SymbolMarketData) {
            if (this.SymbolMarketData.hasOwnProperty(symbol)) {
                let md: IMarketData = this.SymbolMarketData[symbol];
                md.Symbol = symbol;
                this.socketService.SendMessage(socketId, 'MarketUpdate', md);
            }
        }
    }
}

