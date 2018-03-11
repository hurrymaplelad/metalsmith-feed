const assert = require('assert');
const xml2js = require('xml2js');
const feed = require('..');
const Metalsmith = require('metalsmith');
const collections = require('metalsmith-collections');
const {promisify} = require('util');

const parseString = promisify(xml2js.parseString);
Metalsmith.prototype.buildAsPromised = promisify(Metalsmith.prototype.build);

describe('metalsmith-feed', function() {
  beforeEach(async function() {
    this.metalsmith = Metalsmith('test/fixtures');

    this.buildJson = async function() {
      const files = await this.metalsmith.buildAsPromised();
      const result = await parseString(files['rss.xml'].contents);
      return result.rss;
    };

    this.site = {
      title: 'Geocities',
      url: 'http://example.com',
      author: 'Philodemus'
    };
  });

  it('renders an RSS feed', async function() {
    this.metalsmith
      .metadata({site: this.site})
      .use(collections({posts: '*.html'}))
      .use(
        feed({
          collection: 'posts'
        })
      );

    const rss = await this.buildJson();
    assert.equal(rss['$']['xmlns:atom'], 'http://www.w3.org/2005/Atom');

    const channel = rss['channel'][0];
    assert.equal(channel.title[0], this.site.title);
    assert.equal(channel.author[0], this.site.author);
    assert.equal(channel.item.length, 1);

    const post = channel.item[0];
    assert.equal(post.title[0], 'Theory of Juice');
    assert.equal(post.description[0], '<p>juice appeal</p>\n');
  });

  it('renders multiple feeds', async function() {
    const metalsmith = Metalsmith('test/fixtures/many_posts')
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

    const files = await metalsmith.buildAsPromised();
    const {rss: rss1} = await parseString(files['rss1.xml'].contents);
    assert(rss1['channel'][0].item.length > 0);

    const {rss: rss2} = await parseString(files['rss2.xml'].contents);
    assert(rss2['channel'][0].item.length > 0);
  });

  it('uses a custom renderer', async function() {
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

    const rss = await this.buildJson();
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
  });

  it('adds custom elements to an item based on a function', async function() {
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

    const rss = await this.buildJson();
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
  });

  it('complains if metalsmith-colllections isnt setup', async function() {
    const metalsmith = this.metalsmith.use(feed({collection: 'posts'}));

    let err = null;
    try {
      await metalsmith.buildAsPromised();
    } catch (e) {
      err = e;
    }
    assert(err);
  });

  it('complains without a site_url', async function() {
    const metalsmith = this.metalsmith
      .use(collections({posts: '*.html'}))
      .use(feed({collection: 'posts'}));

    let err = null;
    try {
      await metalsmith.buildAsPromised();
    } catch (e) {
      err = e;
    }
    assert(err);
  });

  it('preprocessor returns uppercase of title', async function() {
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

    const rss = await this.buildJson();
    const post = rss['channel'][0].item[0];
    assert.equal(post.title[0], 'THEORY OF JUICE');
  });

  describe('limit option', function() {
    beforeEach(function() {
      this.metalsmith = Metalsmith('test/fixtures/many_posts')
        .metadata({site: this.site})
        .use(collections({posts: '*.html'}));
    });

    it('limits the number of documents included in the feed', async function() {
      this.metalsmith.use(
        feed({
          collection: 'posts',
          limit: 10
        })
      );

      const rss = await this.buildJson();
      assert.equal(rss['channel'][0].item.length, 10);
    });

    it('is unlimited when set to false', async function() {
      this.metalsmith.use(
        feed({
          collection: 'posts',
          limit: false
        })
      );

      const rss = await this.buildJson();
      assert.equal(rss['channel'][0].item.length, 25);
    });
  });

  describe('item with external url', function() {
    beforeEach(function() {
      return (this.metalsmith = Metalsmith('test/fixtures/external_link')
        .metadata({site: this.site})
        .use(collections({posts: '*.html'})));
    });

    it('url should be link set in the post', async function() {
      this.metalsmith.use(
        feed({
          collection: 'posts'
        })
      );

      const rss = await this.buildJson();
      const channel = rss['channel'][0];

      const post = channel.item[1];
      assert.equal(post.title[0], 'Theory of Juice - External');
      assert.equal(post.link[0], 'https://theory.com/juice/');
      assert.equal(post.guid[0]._, 'http://example.com/postwithlink.html');
    });

    it('url should permalink', async function() {
      this.metalsmith.use(
        feed({
          collection: 'posts'
        })
      );

      const rss = await this.buildJson();
      const channel = rss['channel'][0];

      const post = channel.item[0];
      assert.equal(post.title[0], 'Theory of Juice');
      assert.equal(post.link[0], 'http://example.com/post.html');
      assert.equal(post.guid[0]._, 'http://example.com/post.html');
    });
  });
});
