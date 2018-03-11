# metalsmith-feed

[![npm](https://img.shields.io/npm/v/metalsmith-feed.svg?style=flat-square)](https://www.npmjs.com/package/metalsmith-feed) [![Build Status](https://img.shields.io/travis/hurrymaplelad/metalsmith-feed.svg?style=flat-square)](https://travis-ci.org/hurrymaplelad/metalsmith-feed) [![Code Style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

A [metalsmith](https://github.com/segmentio/metalsmith) plugin to generate an RSS feed for a collection.

Just a thin wrapper around the [rss](https://github.com/dylang/node-rss) module.

Requires [metalsmith-collections](https://github.com/segmentio/metalsmith-collections). Plays nicely with [permalinks](https://github.com/segmentio/metalsmith-permalinks), [more](https://github.com/kfranqueiro/metalsmith-more), and [excerpts](https://github.com/segmentio/metalsmith-excerpts).

## Usage

```js
const collections = require('metalsmith-collections');
const feed = require('metalsmith-feed');

Metalsmith('example')
  .metadata(
    (site: {
      title: 'Geocities',
      url: 'http://example.com',
      author: 'Philodemus'
    })
  )
  .use(collections({posts: '*.html'}))
  .use(feed({collection: 'posts'}));
```

### Options

Take a look at the tests for [example usage](test/metalsmith_feed.test.js).

* `collection` **string** _Required_. The name of the configured metalsmith-collection to feed.

* `limit` **Number** _Optional_. Maximum number of documents to show in the feed. Defaults to `20`. Set to `false` to include all documents.

* `destination` **string** _Optional_. File path to write the rendered XML feed. Defaults to `'rss.xml'`.

* `preprocess` **function** _Optional_. Map collection entries to [RSS items](https://github.com/dylang/node-rss#itemoptions). Some fields (like `description` and `url`) have default mappings that support Metalsmith plugin conventions. Many other fields (like `title`, `author`, and `date`) work great without any customization. You can customize any of these fields in `preprocess`.

  ```js
  Metalsmith('example').use(
    feed({
      collection: 'posts',
      preprocess: file => ({
        ...file,
        // Make all titles uppercase
        title: file.title.toUpperCase()

        /*
  description: ...
  Description defaults to `file.less` from metalsmith-more,
  `file.excerpt` from metalsmith-excerpt, and finally the
  full `file.contents`
  ```

url: ...
If files have `path` metadata (perhaps from metalsmith-permalinks)
but not `url` metadata, we'll prefix `path` with `site_url` to
generate links.
\*/
})
})
);

````
Remaining options are passed to the [rss](https://github.com/dylang/node-rss) module as `feedOptions`, along with `metadata.site`.

### Multiple Feeds

Have a few collections you'd like to export? Register this plugin once for each:

```js
Metalsmith('example')
.use(
  collections({
    foo: 'foo/*.html',
    bar: 'bar/*.html'
  })
)
.use(
  feed({
    collection: 'foo',
    destination: 'foo-rss.xml'
  })
)
.use(
  feed({
    collection: 'bar',
    destination: 'bar-rss.xml'
  })
);
````
