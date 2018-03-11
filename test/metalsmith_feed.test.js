const assert = require('assert');
const xml2js = require('xml2js');
const feed = require('..');
const Metalsmith = require('metalsmith');
const collections = require('metalsmith-collections');
const {promisify} = require('util');

const parseString = promisify(xml2js.parseString);

const parse = async function(files, filename = 'rss.xml') {
  const result = await parseString(files[filename].contents);
  return result.rss;
};

Metalsmith.prototype.buildAsPromised = promisify(Metalsmith.prototype.build);
const build = async function(metalsmith) {
  return await metalsmith.buildAsPromised();
};

const metalsmithWithComplexFixtures = function() {
  return Metalsmith('test/fixtures/complex')
    .metadata({site})
    .use(collections({posts: '*.html'}));
};

const parseComplexFixtures = async function(files) {
  const rss = await parse(files);
  const channel = rss.channel[0];

  return {
    postWithoutMeta: channel.item[0],
    postWithMeta: channel.item[1]
  };
};

const site = {
  title: 'Geocities',
  url: 'http://example.com',
  author: 'Philodemus'
};

describe('metalsmith-feed', function() {
  beforeEach(async function() {});

  it('renders an RSS feed', async function() {
    const metalsmith = Metalsmith('test/fixtures/simple')
      .metadata({site})
      .use(collections({posts: '*.html'}))
      .use(
        feed({
          collection: 'posts'
        })
      );

    const rss = await parse(await build(metalsmith));
    assert.equal(rss['$']['xmlns:atom'], 'http://www.w3.org/2005/Atom');
    const channel = rss.channel[0];
    assert.equal(channel.title[0], site.title);
    assert.equal(channel.author[0], site.author);
    assert.equal(channel.item.length, 1);

    const post = channel.item[0];
    assert.equal(post.title[0], 'Theory of Juice');
    assert.equal(post.description[0], '<p>juice appeal</p>\n');
  });

  it('renders multiple feeds', async function() {
    const metalsmith = Metalsmith('test/fixtures/many_posts')
      .metadata({site})
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

    const files = await build(metalsmith);

    const rss1 = await parse(files, 'rss1.xml');
    assert(rss1['channel'][0].item.length > 0);

    const rss2 = await parse(files, 'rss2.xml');
    assert(rss2['channel'][0].item.length > 0);
  });

  describe('metalsmith integration', function() {
    it('sets url to permalink', async function() {
      const metalsmith = metalsmithWithComplexFixtures().use(
        feed({collection: 'posts'})
      );
      const {postWithoutMeta} = await parseComplexFixtures(
        await build(metalsmith)
      );
      assert.equal(
        postWithoutMeta.link[0],
        'http://example.com/post_without_meta.html'
      );
      assert.equal(
        postWithoutMeta.guid[0]._,
        'http://example.com/post_without_meta.html'
      );
    });

    it('sets url to external link from file meta', async function() {
      const metalsmith = metalsmithWithComplexFixtures().use(
        feed({collection: 'posts'})
      );
      const {postWithMeta} = await parseComplexFixtures(
        await build(metalsmith)
      );
      assert.equal(postWithMeta.link[0], 'https://theory.com/juice/');
      assert.equal(
        postWithMeta.guid[0]._,
        'http://example.com/post_with_meta.html'
      );
    });
  });

  describe('preprocessor option', function() {
    it('can customize description', async function() {
      const metalsmith = Metalsmith('test/fixtures/simple')
        .metadata({site})
        .use(collections({posts: '*.html'}))
        .use(
          feed({
            collection: 'posts',
            preprocess: file => ({
              ...file,
              description: `<h1>${file.title}</h1>${file.contents}`
            })
          })
        );

      const rss = await parse(await build(metalsmith));
      const post = rss.channel[0].item[0];
      assert.equal(post.title[0], 'Theory of Juice');
      assert.equal(
        post.description[0],
        '<h1>Theory of Juice</h1><p>juice appeal</p>\n'
      );
    });

    it('can add custom_elements for podcasts', async function() {
      const makeFeaturedImage = file => {
        if (!file.featuredImage) {
          return null;
        }
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
      };

      const metalsmith = Metalsmith('test/fixtures/complex')
        .metadata({site})
        .use(collections({posts: '*.html'}))
        .use(
          feed({
            collection: 'posts',
            preprocess: file => ({
              ...file,
              custom_elements: makeFeaturedImage(file)
            })
          })
        );

      const {postWithMeta, postWithoutMeta} = await parseComplexFixtures(
        await build(metalsmith)
      );

      assert.equal(
        postWithMeta['media:image'][0]['$']['url'],
        'http://example.com/foo.jpg'
      );
      assert.equal(postWithMeta['media:image'][0]['$']['medium'], 'image');

      assert.equal(postWithoutMeta['media:image'], undefined);
    });
  });

  describe('limit option', function() {
    beforeEach(function() {
      this.metalsmith = Metalsmith('test/fixtures/many_posts')
        .metadata({site})
        .use(collections({posts: '*.html'}));
    });

    it('limits the number of documents included in the feed', async function() {
      this.metalsmith.use(
        feed({
          collection: 'posts',
          limit: 10
        })
      );

      const rss = await parse(await build(this.metalsmith));
      assert.equal(rss.channel[0].item.length, 10);
    });

    it('is unlimited when set to false', async function() {
      this.metalsmith.use(
        feed({
          collection: 'posts',
          limit: false
        })
      );

      const rss = await parse(await build(this.metalsmith));
      assert.equal(rss.channel[0].item.length, 25);
    });
  });

  it('complains if metalsmith-collections isnt setup', async function() {
    const metalsmith = Metalsmith('test/fixtures/simple')
      .metadata({site})
      .use(
        feed({
          collection: 'posts'
        })
      );

    try {
      await metalsmith.buildAsPromised();
    } catch (e) {
      var err = e;
    }
    assert(err);
  });

  it('complains without a site_url', async function() {
    const metalsmith = Metalsmith('test/fixtures/simple')
      .use(collections({posts: '*.html'}))
      .use(
        feed({
          collection: 'posts'
        })
      );

    try {
      await metalsmith.buildAsPromised();
    } catch (e) {
      var err = e;
    }
    assert(err);
  });
});
