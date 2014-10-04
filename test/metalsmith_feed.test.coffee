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

  it 'renders an RSS feed', (done) ->
    @site =
      title: 'Geocities'
      url: 'http://example.com'
      author: 'Philodemus'

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

  it 'complains if metalsmith-colllections isnt setup', (done) ->
    @metalsmith
    .use feed collection: 'posts'
    .build (err, files) ->
      assert.throws ->
        assert.ifError err
      , /collections/
      done()

  it 'complains without a site_url', ->
    @metalsmith
    .use collections posts: '*.html'
    .use feed collection: 'posts'
    .build (err, files) ->
      assert.throws ->
        assert.ifError err
      , /site_url/
      done()


