module.exports = function(app) {
    var router = app.get('express').Router(),
        request = require('request'),
        crypto = require('crypto'),
        config = app.get('config'),
        fs = require("fs"),
        gm = false;
    if (app.get('config').graphicsmagick) {
        gm = require('gm');
    }
    router.get('/yandex', function(req, res) {
        if (app.get('settings') && app.get('settings').site_mode && (app.get('settings').site_mode == 'private' || app.get('settings').site_mode == 'invites')) return res.redirect(303, config.protocol + '://' + (req.session.auth_redirect_host || req.get('host')) + "/auth?rnd=" + Math.random().toString().replace('.', ''));
        var config_auth = app.get('config_auth');
        var code = req.query.code;
        if (!code) return res.redirect(303, config.protocol + '://' + (req.session.auth_redirect_host || req.get('host')) + "/auth?rnd=" + Math.random().toString().replace('.', ''));
        var url = 'https://oauth.yandex.ru/token';
        request.post(url, {
            form: {
                code: code,
                client_id: config_auth.yandex.clientID,
                client_secret: config_auth.yandex.clientSecret,
                grant_type: 'authorization_code'
            }
        }, function(error, response, body) {
            if (error || !body) return res.redirect(303, config.protocol + '://' + (req.session.auth_redirect_host || req.get('host')) + "/auth?rnd=" + Math.random().toString().replace('.', ''));
            var data = JSON.parse(body);
            if (!data.access_token) return res.redirect(303, config.protocol + '://' + (req.session.auth_redirect_host || req.get('host')) + "/auth?rnd=" + Math.random().toString().replace('.', ''));
            var data_url = 'https://login.yandex.ru/info?format=json&oauth_token=' + data.access_token;
            request.get(data_url, function(error, response, body) {
                if (error || response.statusCode != 200) return res.redirect(303, config.protocol + '://' + (req.session.auth_redirect_host || req.get('host')) + "/auth?rnd=" + Math.random().toString().replace('.', ''));
                var user_data = JSON.parse(body);
                app.get('mongodb').collection('users').find({
                    email: user_data.default_email
                }, {
                    limit: 1
                }).toArray(function(err, items) {
                    if (err) return res.redirect(303, config.protocol + '://' + (req.session.auth_redirect_host || req.get('host')) + "/auth?rnd=" + Math.random().toString().replace('.', ''));
                    if (!items || !items.length) {
                        var _now = Date.now();
                        var user = {
                            username: 'ya_' + _now,
                            realname: user_data.real_name,
                            email: user_data.default_email,
                            password: crypto.createHash('md5').update(config.salt + '.' + Math.random()).digest('hex'),
                            username_auth: 'ya_' + _now,
                            need_finish: '1',
                            regdate: Date.now(),
                            status: 1
                        };
                        app.get('mongodb').collection('users').insert(user, function(err, items) {
                            if (err) return res.redirect(303, config.protocol + '://' + (req.session.auth_redirect_host || req.get('host')) + "/auth?rnd=" + Math.random().toString().replace('.', ''));
                            var user_id = items[0]._id.toHexString();
                            if (!user_id) return res.redirect(303, config.protocol + '://' + (req.session.auth_redirect_host || req.get('host')) + "/auth?rnd=" + Math.random().toString().replace('.', ''));
                            app.get('mongodb').collection('users').find({
                                _id: items[0]._id
                            }, {
                                limit: 1
                            }).toArray(function(err, items) {
                                if (err || typeof items == 'undefined' || !items || !items.length) return res.redirect(303, config.protocol + '://' + (req.session.auth_redirect_host || req.get('host')) + "/auth?rnd=" + Math.random().toString().replace('.', ''));
                                req.session.auth = items[0];
                                req.session.auth.timestamp = Date.now();
                                delete req.session.auth.password;
                                return _redirect(req, res);
                            });
                        });
                    } else {
                        req.session.auth = items[0];
                        req.session.auth.timestamp = Date.now();
                        delete req.session.auth.password;
                        return _redirect(req, res);
                    }
                });
            });
        });
    });

    var _redirect = function(req, res) {
        // Redirect
        var redirect_host = config.protocol + '://' + (req.session.auth_redirect_host || req.get('host'));
        if (req.session.auth_redirect) {
            return res.redirect(303, redirect_host + req.session.auth_redirect);
        } else {
            return res.redirect(303, redirect_host + "/auth/profile?rnd=" + Math.random().toString().replace('.', ''));
        }
    };

    return router;
};
