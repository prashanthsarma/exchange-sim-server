import { IQuote, Order, Fill, OrderType } from './../../Client/Shared/Entities/Quote';
import { Side } from './../../Client/Shared/Entities/Enums';

export class OrderList {
    Symbol: string;
    BuyOrders: Order[];
    SellOrders: Order[];
    MatchOrders: Order[];
    CancelOrders: Order[];

    IsSellSortRequired = true;
    IsBuySortRequired = true;

    constructor(symbol: string) {
        this.Symbol = symbol;
        this.BuyOrders = new Array<Order>();
        this.SellOrders = new Array<Order>();
        this.MatchOrders = new Array<Order>();
        this.CancelOrders = new Array<Order>();
    }



    Add(order: Order) {
        if (order.RemainingQuantity == 0)
            this.MatchOrders.push(order);
        else if (order.OrderType == OrderType.Specific) {
            if (order.Side == Side.Buy) {
                this.BuyOrders.push(order);
                this.IsBuySortRequired = true;
            }
            else if (order.Side == Side.Sell) {
                this.SellOrders.push(order);
                this.IsSellSortRequired = true;
            }
        }
        else {
            if (order.Side == Side.Buy)
             {

              this.BuyOrders.push(order);
              this.IsBuySortRequired = true;
             }
            else
             {
                    this.SellOrders.push(order);
                    this.IsSellSortRequired = true;
             }
        }
    }

    ShiftBuyToMatch(orders: Order[]) {
        orders.forEach(element => {
            let index: number = this.BuyOrders.indexOf(element);
            this.BuyOrders.splice(index, 1);
            this.MatchOrders.push(element);
        });
    }

    ShiftSellToMatch(orders: Order[]) {
        orders.forEach(element => {
            let index: number = this.SellOrders.indexOf(element);
            this.SellOrders.splice(index, 1);
            this.MatchOrders.push(element);
        });
    }

    CancelOrder(order: Order) {
        this.CancelOrders.push(order);
    }
}