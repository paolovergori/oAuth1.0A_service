oAuth1.0A_service
=================

Webinos testbed got oAuth 1.0A service


PRE-INSTALLATION STEPS:

- Generate key.pem and cert.pem (mandatory because devServer is an https server) to be placed in devServer folder

- Configure config.js adding Twitter application developer consumer key and consumer secret. A devServer callback address to main page is also needed (e.g. https://<yourRoutableIPaddr:unfirewalledPort>//accessToken.html).

To install required node dependencies run: 
    - npm install oauth util https url fs child_process forever
    - npm install git+https://github.com/paolovergori/tweeter.js.git

HOWTO RUN IT: forever server.js