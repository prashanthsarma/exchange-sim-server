
import { IQuote, Order, OrderType, ExecutionType, Fill } from './../../../Client/src/Shared/Entities/Quote';

export class Sorter {

    static comparePriceAscending = (a: Order, b: Order): number => {
        return 0;
    }

    

    static compareAscending = (a: Order, b: Order, f: (o: Order) => any): number => {
        if (f(a) < f(b)) {
            return -1;
        }
        if (f(a) > f(b)) {
            return 1;
        }
        // a must be equal to b
        return 0;
    }
    static compareDescending = (a: Order, b: Order, f: (o: Order) => any): number => {
        if (f(a) > f(b)) {
            return -1;
        }
        if (f(a) < f(b)) {
            return 1;
        }
        // a must be equal to b
        return 0;
    }

    static SortAscending = (orders: Order[], last: number) => {
        orders.forEach(element => {
            if (element.OrderType === OrderType.Market)
                element.Price = last;
        });
        orders.sort((a: Order, b: Order): number => {
            return Sorter.compareAscending(a,b, (o:Order)=> o.Timestamp.getTime()); 
        });
        orders.sort((a: Order, b: Order): number => {
            return Sorter.compareAscending(a,b, (o:Order)=> o.Price); 
        });

    }

    static SortDescending = (orders: Order[], last: number) => {
        orders.forEach(element => {
            if (element.OrderType === OrderType.Market)
                element.Price = last;
        });
        orders.sort((a: Order, b: Order): number => {
            return Sorter.compareAscending(a,b, (o:Order)=> o.Timestamp.getTime()); 
        });
        orders.sort((a: Order, b: Order): number => {
            return Sorter.compareDescending(a,b, (o:Order)=> o.Price); 
        });

    }
}
