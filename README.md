# product-scanner
MDNS network scanner for holusion products

 > Example usage : see [example.js](https://github.com/Holusion/product-scanner/blob/master/example.js).

## Import

```
import ProductScanner from "@holusion/product-scanner";
const s = new ProductScanner(); //Defaults are usually good
```

## API

### Events

#### error

forwards errors from [multicast-dns](https://www.npmjs.com/package/multicast-dns).

#### ready

emits a **ready** event once multicast-dns started successfully
It is necessary to wait for it before calling `ProductScanner.refresh()`.

#### change

emitted each time a new node is detected or some node is updated.

Does not perform deduplication so it might get called a lot on noisy networks.

#### remove

Emitted with the node's **host** property if a node is removed, either due to timeout or graceful shutdown


### Methods

#### refresh(ids :string, timeout:number=500)

force-refresh a list of hosts within a set time.

Everything that did not respond on time will be removed through the emission of a "remove" event.

Resolves once the timeout expires or all nodes answered.

#### close()

closes the scanner and the underlying multicast-dns socket if using the default one.


## Improvements

 - currently no difference is made between services ttl (long) and addresses ttl (short). a record-dependant refresh cycle could be established
 - refresh could be improved. It currently does a broadcast instead of sending requests only to target nodes
 - some "network health" statistics could be gathered to use a network-dependant value for refresh's timeout.
