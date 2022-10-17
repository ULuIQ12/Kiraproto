# Kira Proto
Three.js take on Kira's WIP to demonstrate soft shadows

Might be a bit advanced if you're just starting with 3D concepts, but I tried to comment and be readable
Everything concerning shadows is tagged "!SHADOW!" in the code for easy lookup
 
 Also contains many things useful in genart:
 - Example of fxhash integration with Liam Egan wrapper  https://github.com/liamegan/fxhash-helpers
 - Container / resize / aspect ratio handling
 - Custom mesh generation ( BuildingGoemetry.ts )
 - Scene optimization techniques, with merging and instancing ( City.ts )
 - Example glsl injection by extending three.js materials (./materials/* )
 - Seeded random texture generation to feed shaders ( RandTexGen.ts )

Based on the official fxhash webpack boilerplate project https://github.com/fxhash/fxhash-webpack-boilerplate

# How to use

You will need to have [nodejs](https://nodejs.org/) installed.

## Installation

> First, make sure that your node version is >= 14

Clone the repository on your machine and move to the directory
```sh
$ git clone https://github.com/ULuIQ12/Kiraproto.git your_folder && cd your_folder
```

Install the packages required for the local environment
```sh
$ npm i
```

## Start local environment

```sh
$ npm start
```

This last command will start a local http server with [live reloading](https://webpack.js.org/configuration/dev-server/#devserverlivereload) enabled so that you can iterate faster on your projects. Open [http://localhost:8080](http://localhost:8080) to see your project in the browser.

## Build

```sh
$ npm run build
```

