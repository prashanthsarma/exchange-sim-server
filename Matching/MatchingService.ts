import { IQuote, Order, Fill, OrderType, OrderStatus } from './../../Client/Shared/Entities/Quote';
import { Side, ClientType } from './../../Client/Shared/Entities/Enums';
import { BuyAlgorithm } from './BuyAlgorithm';
import { SellAlgorithm } from './SellAlgorithm';
import {MarketDataService} from './../MarketDataService/MarketDataService'
import {PositionDataService} from './../PositionDataService/PositionDataService'
import {OrderList} from './OrderList'
import { StockServer } from './../StockServer';



export class MatchingService {
    marketDataService: MarketDataService;
    positionDataService: PositionDataService;
    buyAlgo: BuyAlgorithm;
    sellAlgo: SellAlgorithm;
    stockServer: StockServer;


    SymbolOrdersMap: OrderList[];

    constructor(marketDataService: MarketDataService, positionDataService: PositionDataService, stockServer: StockServer) {
        this.marketDataService = marketDataService;
        this.positionDataService = positionDataService;
        this.stockServer = stockServer;
        this.buyAlgo = new BuyAlgorithm(this.marketDataService, this.positionDataService, this.stockServer);
        this.sellAlgo = new SellAlgorithm(this.marketDataService, this.positionDataService, this.stockServer);
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
            case OrderType.Market:
                o.Price = this.marketDataService.LastPrice(o.Symbol);
            case OrderType.Specific: //orderList.Add(o);
            case OrderType.Limit:

                if (o.Side == Side.Buy) {
                    setTimeout(() => {
                        this.buyAlgo.RunMatching(o, orderList);
                    }, 0);
                }
                else {
                    setTimeout(() => {
                        this.sellAlgo.RunMatching(o, orderList);
                    }, 0);
                }
                setTimeout(() => {
                    this.marketDataService.RecalculateAsk(o.Symbol, orderList);
                    this.marketDataService.RecalculateBid(o.Symbol, orderList);
                }, 0);
                break;
        }
            this.stockServer.SendUpdate(o);
            setTimeout(() => {
                this.positionDataService.UpdateNewOrder(o);
            }, 0);
            
    }

    CancelOrder(cancel: { Id: number, Symbol: string }) {
        let orderList = this.GetOrderListFor(cancel.Symbol);
        let orders = orderList.BuyOrders.filter((o) => cancel.Id == o.Id);
        if (orders.length !== 0) {
            orders.forEach((o) => {
                this.Cancel(o);
                let index = orderList.BuyOrders.indexOf(o);
                orderList.BuyOrders.splice(index, 1);
            });
        } else {
            orders = orderList.SellOrders.filter((o) => cancel.Id == o.Id);
            if (orders.length !== 0) {
                orders.forEach((o) => {
                    this.Cancel(o);
                    let index = orderList.SellOrders.indexOf(o);
                    orderList.SellOrders.splice(index, 1);
                });

            }
        }
        setTimeout(() => {
            this.marketDataService.RecalculateAsk(cancel.Symbol, orderList);
            this.marketDataService.RecalculateBid(cancel.Symbol, orderList);
        }, 0)
        return false;
    }

    Cancel(order: Order) {
        let cancelQuantity = order.Quantity - order.FillQuantity;
        if (order.FillQuantity > 0) {
            order.Status = OrderStatus.Modified;
            order.Quantity = order.FillQuantity;
        }
        else {
            order.Status = OrderStatus.Cancelled;
        }
        this.stockServer.SendUpdate(order);
        setTimeout(() => {
            this.positionDataService.CancelOrder(order);
        }, 0);
    }


}

