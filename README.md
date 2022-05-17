# product-scanner
MDNS network scanner for holusion products

Example usage : 

```
import scanner from "@holusion/product-scanner";

for await (let host of scanner()){
    console.log("Host changed : ", host);
}

```