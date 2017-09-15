fs = require 'fs'
assert = require 'assert'
{parseString} = require 'xml2js'
feed = require '..'
Metalsmith = require 'metalsmith'
collections = require 'metalsmith-collections'

describe 'metalsmith-feed', ->
  beforeEach ->
    @metalsmith = Metalsmith('test/fixtures')

    @buildJson = (done) ->
      @metalsmith.build (err, files) ->
        assert.ifError err
        parseString files['rss.xml'].contents, (err, result) ->
          assert.ifError err
          done result.rss

    @site =
      title: 'Geocities'
      url: 'http://example.com'
      author: 'Philodemus'

  it 'renders an RSS feed', (done) ->
    @metalsmith
    .metadata {@site}
    .use collections posts: '*.html'
    .use feed
      collection: 'posts'

    @buildJson (rss) =>
      assert.equal rss['$']['xmlns:atom'], 'http://www.w3.org/2005/Atom'

      channel = rss['channel'][0]
      assert.equal channel.title[0], @site.title
      assert.equal channel.author[0], @site.author
      assert.equal channel.item.length, 1

      post = channel.item[0]
      assert.equal post.title[0], 'Theory of Juice'
      assert.equal post.description[0], '<p>juice appeal</p>\n'
      done()

  it 'uses a custom renderer', (done) ->
    @metalsmith
    .metadata {@site}
    .use collections posts: '*.html'
    .use feed
      collection: 'posts'
      postDescription: (file) ->
        '<h1>' + file.title + '</h1>' + file.contents

    @buildJson (rss) =>
      assert.equal rss['$']['xmlns:atom'], 'http://www.w3.org/2005/Atom'

      channel = rss['channel'][0]
      assert.equal channel.title[0], @site.title
      assert.equal channel.author[0], @site.author
      assert.equal channel.item.length, 1

      post = channel.item[0]
      assert.equal post.title[0], 'Theory of Juice'
      assert.equal post.description[0], '<h1>Theory of Juice</h1><p>juice appeal</p>\n'
      done()

  it 'adds custom elements to an item based on a function', (done) ->
    @metalsmith = Metalsmith('test/fixtures/complex')
    .metadata {@site}
    .use collections posts: '*.html'
    .use feed
      collection: 'posts'
      postCustomElements: (file) ->
        if file.featuredImage
          [
            'media:image': [
              _attr:
                url: 'http://example.com' + file.featuredImage,
                medium: 'image'
            ]
          ]

    @buildJson (rss) ->
      assert.equal rss['$']['xmlns:atom'], 'http://www.w3.org/2005/Atom'

      channel = rss['channel'][0]
      post = channel.item[0]
      assert.equal post['media:image'][0]['$']['url'], 'http://example.com/foo.jpg'
      assert.equal post['media:image'][0]['$']['medium'], 'image'

      post = channel.item[1]
      assert.equal post['media:image'], undefined
      done()

  it 'complains if metalsmith-colllections isnt setup', (done) ->
    @metalsmith
    .use feed collection: 'posts'
    .build (err, files) ->
      assert.throws ->
        assert.ifError err
      , /collections/
      done()

  it 'complains without a site_url', (done) ->
    @metalsmith
    .use collections posts: '*.html'
    .use feed collection: 'posts'
    .build (err, files) ->
      assert.throws ->
        assert.ifError err
      , /site_url/
      done()

  it 'preprocessor returns uppercase of title', (done) ->
    @metalsmith
    .metadata {@site}
    .use collections posts: '*.html'
    .use feed
      collection: 'posts'
      preprocess: (itemData) ->
        itemData.title = itemData.title.toUpperCase()
        itemData

    @buildJson (rss) =>
      post = rss['channel'][0].item[0]
      assert.equal post.title[0], 'THEORY OF JUICE'
      done()

  describe 'limit option', ->
    beforeEach ->
      @metalsmith = Metalsmith('test/fixtures/many_posts')
      .metadata {@site}
      .use collections posts: '*.html'

    it 'limits the number of documents included in the feed', (done) ->
      @metalsmith.use feed
        collection: 'posts'
        limit: 10

      @buildJson (rss) =>
        assert.equal rss['channel'][0].item.length, 10
        done()

    it 'is unlimited when set to false', (done) ->
      @metalsmith.use feed
        collection: 'posts'
        limit: false

      @buildJson (rss) =>
        assert.equal rss['channel'][0].item.length, 25
        done()
