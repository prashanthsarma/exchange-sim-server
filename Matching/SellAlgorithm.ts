import { IQuote, Order, OrderType, ExecutionType, Fill, OrderStatus } from './../../Client/Shared/Entities/Quote';
import {MarketDataService, PriceType} from './../MarketDataService/MarketDataService'
import {PositionDataService} from './../PositionDataService/PositionDataService'
import {OrderList} from './OrderList'
import {Sorter} from './Sorter'
import {FillState} from './BuyAlgorithm'
import {StockServer} from './../StockServer'

export class SellAlgorithm {
    marketDataService: MarketDataService;
    positionDataService: PositionDataService
    stockServer: StockServer;

    constructor(marketDataService: MarketDataService,
        positionDataService: PositionDataService,
        stockServer: StockServer) {

        this.positionDataService = positionDataService;
        this.marketDataService = marketDataService;
        this.stockServer = stockServer;
    }

    RunMatching(sell: Order, orders: OrderList) {
        console.log('Run Sell Matching for: ' + sell.Id + ' User: ' + sell.User);
        let last: number = this.marketDataService.LastPrice(sell.Symbol);
        let filledBuyOrders: Order[] = new Array<Order>();
        if (orders.IsBuySortRequired) {
            Sorter.SortDescending(orders.BuyOrders, last);
            //orders.IsBuySortRequired = false;
        }

        for (let i = 0; i < orders.BuyOrders.length && sell.RemainingQuantity > 0; i++) {
            let buy = orders.BuyOrders[i];
            if (buy.OrderType !== OrderType.Market && sell.OrderType !== OrderType.Market && buy.Price < sell.Price)
                continue;
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

        setTimeout(() => { this.NotifyStocks(sell, filledBuyOrders); }, 0);

        if (sell.fills.length > 0) {
            orders.ShiftBuyToMatch(filledBuyOrders.filter(o => o.RemainingQuantity === 0));
            this.marketDataService.Change(sell.Symbol, PriceType.Last, filledBuyOrders.pop().Price);
        }
        else {
            orders.SellOrders.push(sell);
        }
    }

    FillOrder(buy: Order, sell: Order, last: number): FillState {
        let fillState: FillState = FillState.NoFill
        if (buy.RemainingQuantity === 0 || sell.RemainingQuantity === 0)
            return fillState;
        let price: number = -1;
        if (buy.OrderType === OrderType.Market && sell.OrderType != OrderType.Market) {
            price = sell.Price;
        }
        else if (sell.OrderType === OrderType.Market && buy.OrderType != OrderType.Market) {
            price = buy.Price;
        }
        else if (sell.OrderType === OrderType.Specific)
            price = sell.Price;
        else if (buy.OrderType === OrderType.Specific) {
            price = buy.Price;
        }
        else if (buy.OrderType === OrderType.Limit && sell.OrderType === OrderType.Limit) {
            price == buy.Price;
        }
        else {
            price = last;
        }
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
        console.log('Match found, Sell: ' + sell.Id + ', Buy: ' + buy.Id);
        buy.fills.push(f);
        sell.fills.push(f);
        if (buy.RemainingQuantity == 0 && sell.RemainingQuantity == 0) {
            fillState = FillState.BothFill;
            buy.Status = OrderStatus.Fill;
            sell.Status = OrderStatus.Fill;
        }

        return fillState;
    }


    NotifyStocks = (order: Order, filledOrders: Order[]) => {
        this.stockServer.SendUpdate(order);
        let isFilled: boolean = filledOrders.length > 1;
        if (isFilled) {
            order.fills.forEach(fill => {
                this.positionDataService.UpdateFill(order.User,
                    order.Symbol,
                    order.Side,
                    fill.Quantity);
            });
        }

        filledOrders.forEach(element => {
            this.stockServer.SendUpdate(element);
            this.positionDataService.UpdateFill(element.User,
                element.Symbol,
                element.Side,
                element.fills[element.fills.length - 1].Quantity);
        });


    }
}
