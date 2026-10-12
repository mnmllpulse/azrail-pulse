import {studioMeta} from '../studio-manifest';
import type {StudioModule} from '../studio-types';
import {mountLedgerStudio,runLedgerStudio} from '../ledger-studio';
const meta=studioMeta('ledger');
export const studioModule:StudioModule={...meta,pendingLabel:'Обновляю Ledger…',mount:mountLedgerStudio,run:runLedgerStudio};
