const assert = require('assert');
const {parseString} = require('xml2js');
const feed = require('..');
const Metalsmith = require('metalsmith');
const collections = require('metalsmith-collections');

describe('metalsmith-feed', function() {
  beforeEach(function() {
    this.metalsmith = Metalsmith('test/fixtures');

    this.buildJson = function(done) {
      return this.metalsmith.build(function(err, files) {
        assert.ifError(err);
        return parseString(files['rss.xml'].contents, function(err, result) {
          assert.ifError(err);
          return done(result.rss);
        });
      });
    };

    return (this.site = {
      title: 'Geocities',
      url: 'http://example.com',
      author: 'Philodemus'
    });
  });

  it('renders an RSS feed', function(done) {
    this.metalsmith
      .metadata({site: this.site})
      .use(collections({posts: '*.html'}))
      .use(
        feed({
          collection: 'posts'
        })
      );

    return this.buildJson(rss => {
      assert.equal(rss['$']['xmlns:atom'], 'http://www.w3.org/2005/Atom');

      const channel = rss['channel'][0];
      assert.equal(channel.title[0], this.site.title);
      assert.equal(channel.author[0], this.site.author);
      assert.equal(channel.item.length, 1);

      const post = channel.item[0];
      assert.equal(post.title[0], 'Theory of Juice');
      assert.equal(post.description[0], '<p>juice appeal</p>\n');
      return done();
    });
  });

  it('renders multiple feeds', function(done) {
    this.metalsmith = Metalsmith('test/fixtures/many_posts')
      .metadata({site: this.site})
      .use(
        collections({
          posts1: 'post1*.html',
          posts2: 'post2*.html'
        })
      )
      .use(
        feed({
          collection: 'posts1',
          destination: 'rss1.xml'
        })
      )
      .use(
        feed({
          collection: 'posts2',
          destination: 'rss2.xml'
        })
      );

    return this.metalsmith.build(function(err, files) {
      assert.ifError(err);
      return parseString(files['rss1.xml'].contents, function(err, {rss}) {
        assert.ifError(err);
        assert(rss['channel'][0].item.length > 0);

        return parseString(files['rss2.xml'].contents, function(err, {rss}) {
          assert.ifError(err);
          assert(rss['channel'][0].item.length > 0);
          return done();
        });
      });
    });
  });

  it('uses a custom renderer', function(done) {
    this.metalsmith
      .metadata({site: this.site})
      .use(collections({posts: '*.html'}))
      .use(
        feed({
          collection: 'posts',
          postDescription(file) {
            return `<h1>${file.title}</h1>${file.contents}`;
          }
        })
      );

    return this.buildJson(rss => {
      assert.equal(rss['$']['xmlns:atom'], 'http://www.w3.org/2005/Atom');

      const channel = rss['channel'][0];
      assert.equal(channel.title[0], this.site.title);
      assert.equal(channel.author[0], this.site.author);
      assert.equal(channel.item.length, 1);

      const post = channel.item[0];
      assert.equal(post.title[0], 'Theory of Juice');
      assert.equal(
        post.description[0],
        '<h1>Theory of Juice</h1><p>juice appeal</p>\n'
      );
      return done();
    });
  });

  it('adds custom elements to an item based on a function', function(done) {
    this.metalsmith = Metalsmith('test/fixtures/complex')
      .metadata({site: this.site})
      .use(collections({posts: '*.html'}))
      .use(
        feed({
          collection: 'posts',
          postCustomElements(file) {
            if (file.featuredImage) {
              return [
                {
                  'media:image': [
                    {
                      _attr: {
                        url: `http://example.com${file.featuredImage}`,
                        medium: 'image'
                      }
                    }
                  ]
                }
              ];
            }
          }
        })
      );

    return this.buildJson(function(rss) {
      assert.equal(rss['$']['xmlns:atom'], 'http://www.w3.org/2005/Atom');

      const channel = rss['channel'][0];
      let post = channel.item[0];
      assert.equal(
        post['media:image'][0]['$']['url'],
        'http://example.com/foo.jpg'
      );
      assert.equal(post['media:image'][0]['$']['medium'], 'image');

      post = channel.item[1];
      assert.equal(post['media:image'], undefined);
      return done();
    });
  });

  it('complains if metalsmith-colllections isnt setup', function(done) {
    return this.metalsmith
      .use(feed({collection: 'posts'}))
      .build(function(err) {
        assert.throws(() => assert.ifError(err), /collections/);
        return done();
      });
  });

  it('complains without a site_url', function(done) {
    return this.metalsmith
      .use(collections({posts: '*.html'}))
      .use(feed({collection: 'posts'}))
      .build(function(err) {
        assert.throws(() => assert.ifError(err), /site_url/);
        return done();
      });
  });

  it('preprocessor returns uppercase of title', function(done) {
    this.metalsmith
      .metadata({site: this.site})
      .use(collections({posts: '*.html'}))
      .use(
        feed({
          collection: 'posts',
          preprocess(itemData) {
            itemData.title = itemData.title.toUpperCase();
            return itemData;
          }
        })
      );

    return this.buildJson(rss => {
      const post = rss['channel'][0].item[0];
      assert.equal(post.title[0], 'THEORY OF JUICE');
      return done();
    });
  });

  describe('limit option', function() {
    beforeEach(function() {
      return (this.metalsmith = Metalsmith('test/fixtures/many_posts')
        .metadata({site: this.site})
        .use(collections({posts: '*.html'})));
    });

    it('limits the number of documents included in the feed', function(done) {
      this.metalsmith.use(
        feed({
          collection: 'posts',
          limit: 10
        })
      );

      return this.buildJson(rss => {
        assert.equal(rss['channel'][0].item.length, 10);
        return done();
      });
    });

    return it('is unlimited when set to false', function(done) {
      this.metalsmith.use(
        feed({
          collection: 'posts',
          limit: false
        })
      );

      return this.buildJson(rss => {
        assert.equal(rss['channel'][0].item.length, 25);
        return done();
      });
    });
  });

  return describe('item with external url', function() {
    beforeEach(function() {
      return (this.metalsmith = Metalsmith('test/fixtures/external_link')
        .metadata({site: this.site})
        .use(collections({posts: '*.html'})));
    });

    it('url should be link set in the post', function(done) {
      this.metalsmith.use(
        feed({
          collection: 'posts'
        })
      );

      return this.buildJson(rss => {
        const channel = rss['channel'][0];

        const post = channel.item[1];
        assert.equal(post.title[0], 'Theory of Juice - External');
        assert.equal(post.link[0], 'https://theory.com/juice/');
        assert.equal(post.guid[0]._, 'http://example.com/postwithlink.html');
        return done();
      });
    });

    return it('url should permalink', function(done) {
      this.metalsmith.use(
        feed({
          collection: 'posts'
        })
      );

      return this.buildJson(rss => {
        const channel = rss['channel'][0];

        const post = channel.item[0];
        assert.equal(post.title[0], 'Theory of Juice');
        assert.equal(post.link[0], 'http://example.com/post.html');
        assert.equal(post.guid[0]._, 'http://example.com/post.html');
        return done();
      });
    });
  });
});
