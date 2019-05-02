# product-scanner
MDNS network scanner for holusion products

see `example.js` for usage.

# API

Use the scanner object

    const {Scanner} = require("@holusion/product-scanner");
    const s = new Scanner({});

### Scanner
Supported constructor options are : 

    autostart Set to false if we want to start scanning later (default true)
    initial initial list of connected devices, for testing purposes or to copy a list of devices
    autorefresh  only when autostart = true <=0 to disable, or a time in ms


### Events

#### add

Emitted with the new [Node](#Node) object when a new node is added

#### update

Emitted with the modified [Node](#Node) object when a network client is modified

#### remove

Emitted when a network node is removed with the [Node](#Node) data. Due to it being no longer reachable, its data might be partial. It should at least have a valid `name` property.

#### change

Emitted with the full array of active [Nodes](#Node) when anything is modified. It is always fired after a "add", "update" or "remove" event.


### Methods

One will generaly mainly interact with the [Events API](#Events). A few utility methods are however made to be publicly usable

#### refresh

rafraichit la liste des Nodes accessibles.


# Troubleshooting

### Known bugs :

- products sometimes don't get removed from the list when shut down
- on linux, avahi prints warning logs on deprecated Bonjour compatibility layer usage
- on linux, `/etc/nsswitch.conf` will choose resolve order : https://github.com/lathiat/nss-mdns

### IPV4-LL support

This module relies on the `dns-sd` protocol to find products. 

As an apple standard, dns-sd is provided by **Bonjour** on every apple device and well integrated in the ecosystem.

On linux, avahi is installed and enabled by default on every recent product. it is `avahi-autoipd` that handles the ipv4ll assignment.

On Windows, Apple provides an installable MSI that provides the Bonjour daemon.

Microsoft does ship ipv4-ll support since ~Windows10. dns-sd works well on windows once Bonjour is installed. 

In theory support should be manually enabled with :

        HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\{000000ID-00DE-VOTRE-0000-000CARTE0RZO}

        IPAutoconfigurationEnabled = 1

But this data seems outdated...

Once the link-local ip is assigned, service name resolution should work OK. It might be blocked on very tight enterprise networks. In this case, there is no known fallback.

Older protocols could be used like **LLMNR** if we wanted to be dependency-free on windows, but it won't tackle the main problem of bad ipv4_ll support.

