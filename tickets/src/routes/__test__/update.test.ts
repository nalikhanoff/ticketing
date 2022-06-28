import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../../app';
import { Ticket } from '../../models/ticket';
import { natsWrapper } from '../../nats-wrapper';

it('returns a 404 if the provided id does not exist', async () => {
  await request(app)
    .put('/api/tickets/' + new mongoose.Types.ObjectId().toHexString())
    .set('Cookie', global.signin())
    .send({
      title: 'asd',
      price: 12,
    })
    .expect(404);
});

it('returns a 401 if the user is not authenticated', async () => {
  await request(app)
    .put('/api/tickets/' + new mongoose.Types.ObjectId().toHexString())
    .send({
      title: 'asd',
      price: 12,
    })
    .expect(401);
});

it('returns a 401 if the user does not own the ticket', async () => {
  const response = await request(app).post('/api/tickets').set('Cookie', global.signin()).send({
    title: 'asd',
    price: 20,
  });

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', global.signin())
    .send({
      title: 'asdfdfcx',
      price: 1000,
    })
    .expect(401);
});

it('returns a 404 if the user provides an invalid title or price', async () => {
  const cookie = global.signin();
  const response = await request(app).post('/api/tickets').set('Cookie', cookie).send({
    title: 'asd',
    price: 20,
  });

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', cookie)
    .send({ title: '', price: 20 })
    .expect(400);

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', cookie)
    .send({ title: 'sadfg', price: -20 })
    .expect(400);
});

it('updates the ticket provided valid inputs', async () => {
  const cookie = global.signin();
  const response = await request(app).post('/api/tickets').set('Cookie', cookie).send({
    title: 'asd',
    price: 20,
  });

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', cookie)
    .send({ title: 'qwerty', price: 40 })
    .expect(200);

  const ticketResponse = await request(app).get(`/api/tickets/${response.body.id}`).send();

  expect(ticketResponse.body.title).toEqual('qwerty');
  expect(ticketResponse.body.price).toEqual(40);
});

it('publishes an event', async () => {
  const cookie = global.signin();
  const response = await request(app).post('/api/tickets').set('Cookie', cookie).send({
    title: 'asd',
    price: 20,
  });

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', cookie)
    .send({ title: 'qwerty', price: 40 })
    .expect(200);

  expect(natsWrapper.client.publish).toHaveBeenCalled();
});

it('rejects updates if the ticket is reserved', async () => {
  const cookie = global.signin();
  const response = await request(app).post('/api/tickets').set('Cookie', cookie).send({
    title: 'asd',
    price: 20,
  });

  const ticket = await Ticket.findById(response.body.id);
  ticket!.set({ orderId: new mongoose.Types.ObjectId().toHexString() });
  await ticket!.save();

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', cookie)
    .send({ title: 'qwerty', price: 40 })
    .expect(400);
});
