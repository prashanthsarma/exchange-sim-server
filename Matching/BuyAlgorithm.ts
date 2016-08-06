import { IQuote, Order, OrderType, ExecutionType, Fill, OrderStatus } from './../../Client/Shared/Entities/Quote';
import {MarketDataService, PriceType} from './../MarketDataService/MarketDataService'
import {OrderList} from './OrderList'
import {Sorter} from './Sorter'
import {StockServer} from './../StockServer'

export class BuyAlgorithm {
    marketDataService: MarketDataService;
    stockServer: StockServer;

    constructor(marketDataService: MarketDataService, stockServer: StockServer) {
        this.marketDataService = marketDataService;
        this.stockServer = stockServer;
    }

    RunMatching(buy: Order, orders: OrderList) {
        let last: number = this.marketDataService.LastPrice(buy.Symbol);
        let filledSellOrders: Order[] = new Array<Order>();
        if (orders.IsSellSortRequired) {
            Sorter.SortAscending(orders.SellOrders, last);
            orders.IsSellSortRequired = false;
        }

        for (let i = 0; i < orders.SellOrders.length && buy.RemainingQuantity > 0; i++) {
            let sell = orders.SellOrders[i];
            if (buy.OrderType !== OrderType.Market && buy.Price > sell.Price)
                break;

            let fillState: FillState = this.FillOrder(buy, sell, last);
            switch (fillState) {
                case FillState.BuyFill:
                    orders.Add(buy);
                    filledSellOrders.push(sell);
                    break;
                case FillState.SellFill:
                    filledSellOrders.push(sell);
                    break;
                case FillState.BothFill:
                    filledSellOrders.push(sell);
                    orders.Add(buy);
                    break;
                default: break;
            }

        }

        if (buy.ExecutionType == ExecutionType.IoC && buy.RemainingQuantity > 0) {
            filledSellOrders.forEach(element => {
                element.fills.pop();
            });
            filledSellOrders = [];
            buy.fills = [];
            orders.CancelOrders.push(buy);
            buy.Status = OrderStatus.Cancelled;
        }
        if (buy.fills.length > 0) {
            this.marketDataService.Change(buy.Symbol, PriceType.Last, buy.FillAvgPrice);
            orders.ShiftSellToMatch(filledSellOrders.filter(o=>o.RemainingQuantity===0));
        }
        this.NotifyStocks(buy, filledSellOrders);
    }

    FillOrder(buy: Order, sell: Order, last: number): FillState {
        let fillState: FillState = FillState.NoFill
        if (sell.RemainingQuantity == 0)
            return fillState;
        let price: number = -1;
        if (sell.OrderType == OrderType.Specific || sell.OrderType == OrderType.Limit)
            price = sell.Price;
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

enum FillState { NoFill, BuyFill, SellFill, BothFill }