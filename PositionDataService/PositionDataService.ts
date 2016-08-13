import {OrderList} from './../Matching/OrderList'
import { IQuote, Order, OrderType, ExecutionType, Fill } from './../../Client/Shared/Entities/Quote';
import { IMarketData, MarketData } from './../../Client/Shared/Entities/MarketData';
import { IPositionData, PositionData, CashPositionData } from './../../Client/Shared/Entities/PositionData';
import { ServerSocketService } from './../ServerSocketService'
import {MarketDataService} from './../MarketDataService/MarketDataService'
import { Side } from './../../Client/Shared/Entities/Enums';

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

    UpdateNewOrder = (user: string, symbol: string, side: Side, quantity: number) => {
        let positionDatSet = this.UserPositionDataset[user];

        let cashData = positionDatSet.Datas['Cash'];
        let data = positionDatSet.Datas[symbol];
        if (data === undefined) {
            data = new PositionData(0);
            positionDatSet.Datas[symbol] = data;
        }
        data.UpdateNewOrder(side, quantity);
        cashData.UpdateNewOrder(side, quantity);
    }

    UpdateFill = (user: string, symbol: string, side: Side, quantity: number) => {
        let positionDatSet = this.UserPositionDataset[user];

        let cashData = positionDatSet.Datas['Cash'];
        let data = positionDatSet.Datas[symbol];
        if (data === undefined) {
            console.log('Error accessing non existant position')
            return;
        }
        data.UpdateFill(side, quantity);
        cashData.UpdateFill(side, quantity);
    }

    CancelOrder = (user: string, symbol: string, side: Side, quantity: number) => {
        let positionDatSet = this.UserPositionDataset[user];

        let cashData = positionDatSet.Datas['Cash'];
        let data = positionDatSet.Datas[symbol];
        if (data === undefined) {
            console.log('Error accessing non existant position')
            return;
        }
        data.CancelOrder(side, quantity);
        cashData.CancelOrder(side, quantity);
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