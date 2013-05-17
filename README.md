# grunt-neuron

> Grunt task for NeuronJS-based JavaScript projects. 
> 
> "Neuron" task will wrap a naked commonjs module.

## Getting Started
This plugin requires Grunt `~0.4.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-neuron --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-neuron');
```

## The "neuron" task

### Overview
In your project's Gruntfile, add a section named `neuron` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  neuron: {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
})
```

### Options

#### options.versionSeparator
Type: `String`

Default value: `'@'`

A string value that is used to divide module name of a dependency and its version, such as `'underscore@0.0.1'`

#### options.define
Type: `String`

Default value: `'define'`


#### options.mainFile
Type: `String`

Default value: `'index.js'`

If a file matches the `pkg.main` in package.json, its will be built and saved as file name `options.mainFile` in the specified dir.

If set to `false`, "neuron" will use the original file name.

### Usage Examples


```js
grunt.initConfig({
  neuron: {
    options: {
      define: 'NR.define'
    },
    all: {
      files: [
        {
          expand: true,
          cwd: 'lib/',
          src: ['**/*.js'],
          
          // build all files inside 'lib/' directory into 'build/'
          dest: 'build/',
          ext: '.js'
        }
      ]
    }
  }
});
```