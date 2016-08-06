import { IEventMessage, ServerSocketService } from './../ServerSocketService';
import { IQuote, Order, OrderType, ExecutionType, Fill } from './../../Client/Shared/Entities/Quote';

export class StockDataUpdater{
    socketService: ServerSocketService;
    constructor(socketService: ServerSocketService){
        this.socketService = socketService;
    }

    Update(order: Order){
        this.socketService.SendMessage(order.Us)
    }
}