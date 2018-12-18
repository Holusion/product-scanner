# product-scanner
MDNS network scanner for holusion products

see `example.js` for usage.

Known bugs :

- products sometimes don't get removed from the list when shut down
- on linux, avahi prints warning logs on deprecated Bonjour compatibility layer usage
- on linux, `/etc/nsswitch.conf` will choose resolve order : https://github.com/lathiat/nss-mdns
