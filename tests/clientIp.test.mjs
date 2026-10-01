// Adresse IP retenue pour les limites de débit : ne doit jamais être une valeur que le client peut choisir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientIp } from '../server/clientIp.mjs';

const req = (headers, remoteAddress = '10.0.0.1') => ({ headers, socket: { remoteAddress } });

test('sans reverse-proxy de confiance : toujours l’adresse de la connexion TCP', () => {
  assert.equal(
    clientIp(req({ 'x-forwarded-for': '203.0.113.9', 'cf-connecting-ip': '203.0.113.9' }), false),
    '10.0.0.1',
  );
});

test('Cloudflare (CF-Connecting-IP) prime sur X-Forwarded-For, même falsifié', () => {
  assert.equal(
    clientIp(
      req({ 'cf-connecting-ip': '198.51.100.7', 'x-forwarded-for': '1.2.3.4, 198.51.100.7' }),
      true,
    ),
    '198.51.100.7',
  );
});

test('sans Cloudflare : le DERNIER maillon de X-Forwarded-For est retenu, jamais le premier', () => {
  // Le premier élément peut être fourni par le client lui-même ; seul le dernier vient du proxy de confiance.
  assert.equal(
    clientIp(req({ 'x-forwarded-for': 'falsifie-par-le-client, 198.51.100.7' }), true),
    '198.51.100.7',
  );
});

test('un client qui n’envoie qu’une seule valeur ne peut pas se faire passer pour quelqu’un d’autre', () => {
  // Si rien n'ajoute de maillon après lui, la seule valeur reçue est la sienne : pas de fausse IP acceptée à sa place
  assert.equal(clientIp(req({ 'x-forwarded-for': '1.2.3.4' }), true), '1.2.3.4');
});

test('en-têtes absents malgré trustProxy : repli sur l’adresse de connexion', () => {
  assert.equal(clientIp(req({}), true), '10.0.0.1');
});

test('aucune adresse disponible : repli sur « inconnu »', () => {
  // null, et non le 2e paramètre omis : un argument explicite undefined réactiverait la valeur par défaut
  assert.equal(clientIp(req({}, null), true), 'inconnu');
});
