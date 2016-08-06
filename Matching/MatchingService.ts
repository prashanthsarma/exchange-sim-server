import { IQuote, Order, Fill, OrderType, OrderStatus } from './../../Client/Shared/Entities/Quote';
import { Side, ClientType } from './../../Client/Shared/Entities/Enums';
import { BuyAlgorithm } from './BuyAlgorithm';
import {MarketDataService} from './../MarketDataService/MarketDataService'
import {OrderList} from './OrderList'
import {StockDataUpdater} from './StockDataUpdater'
import { StockServer } from './../StockServer';



export class MatchingService {
    marketDataService: MarketDataService;
    stockDataUpdater: StockDataUpdater;
    buyAlgo: BuyAlgorithm;
    stockServer: StockServer;


    SymbolOrdersMap: OrderList[];

    constructor(marketDataService: MarketDataService, stockServer: StockServer) {
        this.marketDataService = marketDataService;
        this.stockServer = stockServer;
        this.buyAlgo = new BuyAlgorithm(this.marketDataService, this.stockServer);
        this.SymbolOrdersMap = new Array<OrderList>();
    }

    GetOrderListFor(symbol: string): OrderList {
        let array: OrderList[] = this.SymbolOrdersMap.filter(d => { return d.Symbol == symbol; });
        if (array.length > 0)
            return array[0];
        else
            return null;
    }
    Add(quote: IQuote) {
        let orderList: OrderList = this.GetOrderListFor(quote.Symbol);
        if (orderList === null) {
            orderList = new OrderList(quote.Symbol);
            this.SymbolOrdersMap.push(orderList);
        }
        let o: Order = new Order(quote);
        o.Status = OrderStatus.Pending;
        switch (o.OrderType) {
            case OrderType.Specific: orderList.Add(o);
                break;
            case OrderType.Market:
                o.Price = this.marketDataService.LastPrice(o.Symbol);
            case OrderType.Limit:

                if (o.Side == Side.Buy) {
                    setTimeout(() => {
                        this.buyAlgo.RunMatching(o, orderList);
                    }, 0);
                }
                else {
                    orderList.Add(o);
                }
                break;
        }
        setTimeout(() => {
            this.stockServer.SendUpdate(o);
        }, 0);
    }
}

