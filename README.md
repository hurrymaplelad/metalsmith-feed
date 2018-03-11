# metalsmith-feed

[![npm](https://img.shields.io/npm/v/npm.svg?style=flat-square)](https://www.npmjs.com/package/metalsmith-feed) [![Build Status](https://img.shields.io/travis/hurrymaplelad/metalsmith-feed.svg?style=flat-square)](https://travis-ci.org/hurrymaplelad/metalsmith-feed)

A [metalsmith](https://github.com/segmentio/metalsmith) plugin to generate an RSS feed for a collection.

Requires [metalsmith-collections](https://github.com/segmentio/metalsmith-collections). Plays nicely with [permalinks](https://github.com/segmentio/metalsmith-permalinks), [more](https://github.com/kfranqueiro/metalsmith-more), and [excerpts](https://github.com/segmentio/metalsmith-excerpts).

## Usage

```js
const collections = require("metalsmith-collections");
const feed = require("metalsmith-feed");

Metalsmith("example")
  .metadata(
    (site: {
      title: "Geocities",
      url: "http://example.com",
      author: "Philodemus"
    })
  )
  .use(collections({ posts: "*.html" }))
  .use(feed({ collection: "posts" }));
```

### Options

Take a look at the tests for [example usage](test/metalsmith_feed.test.coffee).

* `collection` **string** _Required_. The name of the configured metalsmith-collection to feed.

* `limit` **Number** _Optional_. Maximum number of documents to show in the feed. Defaults to `20`. Set to `false` to include all documents.

* `destination` **string** _Optional_. File path to write the rendered XML feed. Defaults to `'rss.xml'`.

* `postDescription` **function** _Optional_. Takes a file and returns a description string. Defaults to `(file) -> file.less or file.excerpt or file.contents`

* `postCustomElements` **function** _Optional_. From a file, return custom elements, like thumbnails, images, or information necessary to publish podcasts.

* `preprocess` **function** _Optional_. Modify collection entries before creating the feed. Example:

  ```js
  Metalsmith("example").use(
    feed({
      collection: "posts",
      preprocess: itemData => {
        // Make all titles uppercase
        itemData.title = itemData.title.toUpperCase();
        return itemData;
      }
    })
  );
  ```

Remaining options are passed to the [rss](https://github.com/dylang/node-rss) module as `feedOptions`, along with `metadata.site`.

If files have `path` metadata (perhaps from [permalinks](https://github.com/segmentio/metalsmith-permalinks)) but not `url` metadata, we'll prefix `path` with `site_url` to generate links. Feed item descriptions default to `file.less` from metalsmith-more, `file.excerpt` from metalsmith-excerpt, and finally the full `file.contents`.

If files have `link` metadata set with any URL, it will be used to set `<link>` of the feed item. The `<guid>` will still be default permalink.

### Multiple Feeds

Have a few collections you'd like to export? Register this plugin once for each:

```js
Metalsmith("example")
  .use(
    collections({
      foo: "foo/*.html",
      bar: "bar/*.html"
    })
  )
  .use(
    feed({
      collection: "foo",
      destination: "foo-rss.xml"
    })
  )
  .use(
    feed({
      collection: "bar",
      destination: "bar-rss.xml"
    })
  );
```
