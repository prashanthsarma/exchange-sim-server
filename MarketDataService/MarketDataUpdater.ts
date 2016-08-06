import { MarketDataService } from './MarketDataService';
import {ServerSocketService} from './../ServerSocketService';

export class MarketdataUpdater{
    marketDataService: MarketDataService;
    
    constructor(marketDataService: MarketDataService){
        this.marketDataService = marketDataService;
        this.marketDataService.on('LastPrice')
    }

    
}