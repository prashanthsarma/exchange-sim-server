import { IQuote, Order, OrderType, ExecutionType, Fill, OrderStatus } from './../../Client/Shared/Entities/Quote';
import {MarketDataService, PriceType} from './../MarketDataService/MarketDataService'
import {OrderList} from './OrderList'
import {Sorter} from './Sorter'
import {FillState} from './BuyAlgorithm'
import {StockServer} from './../StockServer'

export class SellAlgorithm {
    marketDataService: MarketDataService;
    stockServer: StockServer;

    constructor(marketDataService: MarketDataService, stockServer: StockServer) {
        this.marketDataService = marketDataService;
        this.stockServer = stockServer;
    }

    RunMatching(sell: Order, orders: OrderList) {
        let last: number = this.marketDataService.LastPrice(sell.Symbol);
        let filledBuyOrders: Order[] = new Array<Order>();
        if (orders.IsBuySortRequired) {
            Sorter.SortAscending(orders.BuyOrders, last);
            //orders.IsBuySortRequired = false;
        }

        for (let i = orders.BuyOrders.length - 1; i >= 0 && sell.RemainingQuantity > 0; i--) {
            let buy = orders.BuyOrders[i];
            if (sell.OrderType !== OrderType.Market && sell.Price > buy.Price)
                break;
            if (buy.OrderType == OrderType.Specific && sell.OrderType === OrderType.Specific)
                continue;


            let fillState: FillState = this.FillOrder(buy, sell, last);
            switch (fillState) {
                case FillState.BuyFill:
                    filledBuyOrders.push(buy);
                    break;
                case FillState.SellFill:
                    orders.Add(sell);
                    filledBuyOrders.push(buy);
                    break;
                case FillState.BothFill:
                    filledBuyOrders.push(buy);
                    orders.Add(sell);
                    break;
                default: break;
            }

        }

        if (sell.ExecutionType == ExecutionType.IoC && sell.RemainingQuantity > 0) {
            filledBuyOrders.forEach(element => {
                element.fills.pop();
            });
            filledBuyOrders = [];
            sell.fills = [];
            orders.CancelOrders.push(sell);
            sell.Status = OrderStatus.Cancelled;
        }
        this.NotifyStocks(sell, filledBuyOrders);
        if (sell.fills.length > 0) {
            orders.ShiftBuyToMatch(filledBuyOrders.filter(o => o.RemainingQuantity === 0));
            this.marketDataService.Change(sell.Symbol, PriceType.Last, filledBuyOrders.pop().Price);
        }
        else{
            orders.SellOrders.push(sell);
        }
    }

    FillOrder(buy: Order, sell: Order, last: number): FillState {
        let fillState: FillState = FillState.NoFill
        if (buy.RemainingQuantity == 0)
            return fillState;
        let price: number = -1;
        if (buy.OrderType == OrderType.Specific || buy.OrderType == OrderType.Limit)
            price = buy.Price;
        else
            price = last;
        let f: Fill = new Fill();

        if (buy.RemainingQuantity > sell.RemainingQuantity) {
            f.Quantity = sell.RemainingQuantity;
            f.Price = price;
            fillState = FillState.SellFill;
            buy.Status = OrderStatus.PartialFill;
            sell.Status = OrderStatus.Fill;
        }
        else {
            f.Quantity = buy.RemainingQuantity;
            f.Price = price;
            fillState = FillState.BuyFill;
            sell.Status = OrderStatus.PartialFill;
            buy.Status = OrderStatus.Fill;
        }
        buy.fills.push(f);
        sell.fills.push(f);
        if (buy.RemainingQuantity == 0 && sell.RemainingQuantity == 0) {
            fillState = FillState.BothFill;
            buy.Status = OrderStatus.Fill;
            sell.Status = OrderStatus.Fill;
        }

        return fillState;
    }


    NotifyStocks = (buy: Order, filledSellOrders: Order[]) => {
        this.stockServer.SendUpdate(buy);
        filledSellOrders.forEach(element => {
            this.stockServer.SendUpdate(element);
        });


    }

}
