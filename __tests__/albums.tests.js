/* eslint-disable no-undef */
const { expect } = require('chai')
const request = require('supertest')
const { Artist, Album } = require('../src/models')
const app = require('../src/app')

describe('/albums', () => {
   let artist
 
   before(async () => {
     try {
       await Artist.sequelize.sync()
       await Album.sequelize.sync()
     } catch (err) {
       console.log(err)
     }
   })
 
   beforeEach(async () => {
     try {
       await Artist.destroy({ where: {} })
       await Album.destroy({ where: {} })
       artist = await Artist.create({
         name: 'Tame Impala',
         genre: 'Rock',
       })
     } catch (err) {
       console.log(err)
     }
   })
 
   describe('POST /artists/:artistId/albums', () => {
     it('creates a new album for a given artist', (done) => {
       request(app)
         .post(`/artists/${artist.id}/albums`)
         .send({
           name: 'InnerSpeaker',
           year: 2010,
         })
         .then((res) => {
           expect(res.status).to.equal(201)
 
           Album.findByPk(res.body.id, { raw: true }).then((album) => {
             expect(album.name).to.equal('InnerSpeaker')
             expect(album.year).to.equal(2010)
             expect(album.artistId).to.equal(artist.id)
             done()
           }).catch(error => done(error))
         }).catch(error => done(error))  
     })

     //this test gives false positives
     it('creates multiple albums for a given artist', (done) => {
      const albums = [
        {name: 'InnerSpeaker', year: 2010},
        {name: 'Currents', year: 2015},
        {name: 'Lonerism', year: 2012}
      ]
      request(app)
        .post(`/artists/${artist.id}/albums`)
        .send({ albums })
        .then((res) => {
          expect(res.status).to.equal(201)
         
          res.body.albums.forEach((resAlbum, i) => {
            Album.findByPk(resAlbum.id, { raw: true }).then((dbAlbum) => {
              // console.log({dbAlbum}, {resAlbum})
              expect(dbAlbum.name).to.equal(albums[2].name)
              expect(dbAlbum.year).to.equal(albums[2].year)
              expect(dbAlbum.artistId).to.equal(artist.id) 
              
            })
          })
          done()
         
        })
        .catch(error => done(error))
     })
 
     it('returns a 404 and does not create an album if the artist does not exist', (done) => {
       request(app)
         .post('/artists/1234/albums')
         .send({
           name: 'InnerSpeaker',
           year: 2010,
         })
         .then((res) => {
           expect(res.status).to.equal(404)
           expect(res.body.error).to.equal('Artist not found')
 
           Album.findAll().then((albums) => {
             expect(albums.length).to.equal(0)
             done()
           })
         })
         .catch(error => done(error))
     })
   })

   describe('with albums in the database', () => {
     let albums, artists;

      beforeEach((done) => {
         Promise.all([
            Artist.create({ name: 'Tame Impala', genre: 'Rock' }),
            Artist.create({ name: 'Kylie Minogue', genre: 'Pop' }),
            Artist.create({ name: 'Dave Brubeck', genre: 'Jazz' }),
         ]).then((documents) => {
            artists = documents
            done()
         })
         .catch(error => done(error))
      })

      beforeEach((done) => {
        Promise.all([
          Album.create({ artistName: 'Tame Impala', name: 'Lonerism', year: 2012 }).then(album => album.setArtist(artists[0])),
          Album.create({ artistName: 'Tame Impala', name: 'Currents', year: 2015 }).then(album => album.setArtist(artists[0])),
          Album.create({ artistName: 'Kylie Minogue',  name: 'Disco', year: 2020 }).then(album => album.setArtist(artists[1])),
          Album.create({ artistName: 'Kylie Minogue',  name: 'Kylie', year: 1988 }).then(album => album.setArtist(artists[1]))
        ]).then((documents) => {
          albums = documents
          done()
        })
        .catch(error => done(error))
      })

      describe('GET /albums', () => {
        it('returns a list of all albums', (done) => {
          request(app)
          .get('/albums')
          .then(res => {
            expect(res.status).to.equal(200)
            expect(res.body.length).to.equal(4)
            res.body.forEach(album => {
              const expected = albums.find(a => a.id === album.id)
              expect(album.artistName).to.equal(expected.artistName)
              expect(album.name).to.equal(expected.name)
              expect(album.year).to.equal(expected.year)
              expect(album.artistId).to.equal(expected.artistId)
            })
            done()
          })
          .catch(error => done(error))
        })

        it('returns the album of a given artist by id', (done) => {
          artist = artists[1]
          console.log(albums[2])
          request(app)
          .get(`/albums/${artist.id}`)
          .then(res => {
            expect(res.status).to.equal(200)
            expect(res.body.length).to.equal(2)
            expect(res.body[0]).to.equal(albums[2].dataValues)
            expect(res.body[1]).to.equal(albums[3].dataValues)
            done()
          })
          .catch(error => done(error))
        })
      })
    })
})