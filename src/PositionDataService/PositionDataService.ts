import {OrderList} from './../Matching/OrderList'
import { IQuote, Order, OrderType, ExecutionType, Fill } from './../../../Client/src/Shared/Entities/Quote';
import { IMarketData, MarketData } from './../../../Client/src/Shared/Entities/MarketData';
import { IPositionData, PositionData, CashPositionData } from './../../../Client/src/Shared/Entities/PositionData';
import { ServerSocketService } from './../ServerSocketService'
import {MarketDataService} from './../MarketDataService/MarketDataService'
import { Side } from './../../../Client/src/Shared/Entities/Enums';

export class PositionDataset {
    Datas: { [Symbol: string]: PositionData };
    constructor() {
        this.Datas = {};
    }
}

export class PositionDataService {
    private marketDataService: MarketDataService;
    constructor(marketDataService: MarketDataService) {
        this.marketDataService = marketDataService;
        this.UserPositionDataset = {};
    }

    private UserPositionDataset: { [User: string]: PositionDataset };

    public InitUser(user: string) {
        let dataset = this.UserPositionDataset[user];
        if (dataset === undefined) {
            dataset = new PositionDataset();
            dataset.Datas['Cash'] = new CashPositionData(10000); //Initial Cash of 10000
            this.UserPositionDataset[user] = dataset;
        }
    }

    UpdateNewOrder = (order: Order) => {
        let positionDatSet = this.UserPositionDataset[order.User];

        let cashData = positionDatSet.Datas['Cash'];
        let data = positionDatSet.Datas[order.Symbol];
        if (data === undefined) {
            data = new PositionData(0);
            positionDatSet.Datas[order.Symbol] = data;
        }
        data.UpdateNewOrder(order);
        cashData.UpdateNewOrder(order);
    }

    UpdateFill = (order: Order, isOnlyLastFillValid: boolean) => {
        let positionDatSet = this.UserPositionDataset[order.User];

        let cashData = positionDatSet.Datas['Cash'];
        let data = positionDatSet.Datas[order.Symbol];
        if (data === undefined) {
            console.log('Error accessing non existant position')
            return;
        }
        data.UpdateFillOrder(order, isOnlyLastFillValid);
        cashData.UpdateFillOrder(order, isOnlyLastFillValid);
    }

    CancelOrder = (order: Order) => {
        let positionDatSet = this.UserPositionDataset[order.User];

        let cashData = positionDatSet.Datas['Cash'];
        let data = positionDatSet.Datas[order.Symbol];
        if (data === undefined) {
            console.log('Error accessing non existant position')
            return;
        }
        data.CancelOrder(order);
        cashData.CancelOrder(order);
    }

    GetPositions(user: string): IPositionData[] {
        let dataArray: IPositionData[] = new Array<PositionData>();
        let datas = this.UserPositionDataset[user].Datas;
        for (var key in datas) {
            if (datas.hasOwnProperty(key)) {
                let positionData:IPositionData = {
                    Symbol:key,
                    Quantity:datas[key].Quantity,
                    NotionalQuantity:datas[key].NotionalQuantity
                } 
                dataArray.push(positionData);
            }
        }
        return dataArray;
    }
}