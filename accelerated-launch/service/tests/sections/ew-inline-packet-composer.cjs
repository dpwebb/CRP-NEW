'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const Module = require('node:module');
const crypto = require('node:crypto');
const lib = require('../../pdf-vendor/pdf-lib-1.17.1.min.js');
const fontkit = require('../../pdf-vendor/fontkit-1.1.1.min.js');
const { composePacket, VERSION } = require('../../packet-composer.cjs');
const bureauForms = require('../../bureau-forms.cjs');
const { pdfText, comparableText } = require('../packet-pdf-assertions.cjs');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const n = value => lib.PDFName.of(value);
// Genuine Standard RC4-128 fixtures made offline from two fictional pages.
// Empty user password / fictional owner; variants with withheld print/copy permissions
// and a required user password. No private sample or runtime Python dependency.
const ENCRYPTED_FIXTURES = Object.freeze({
  "allowed": "JVBERi0xLjcKJeLjz9MKMSAwIG9iago8PAovUHJvZHVjZXIgPGMxODU5Mjc4NmU+Ci9DcmVhdGlvbkRhdGUgPGY1YzZkMDJjMzg3YmZjODZmNDRjNWFmMzMzOWJlODUzYzE+Ci9Nb2REYXRlIDxmNWM2ZDAyYzM4N2JmYzg2ZjQ0YzVhZjMzMzliZTg1M2MxPgovVGl0bGUgPD4KPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9Db3VudCAyCi9LaWRzIFsgNCAwIFIgNyAwIFIgXQo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1Jlc291cmNlcyA8PAovRm9udCA8PAovSGVsdmV0aWNhLTcwOTg0ODA3ODkgNSAwIFIKPj4KL1hPYmplY3QgPDwKPj4KL0V4dEdTdGF0ZSA8PAo+Pgo+PgovTWVkaWFCb3ggWyAwIDAgNjEyIDc5MiBdCi9Bbm5vdHMgWyBdCi9Db250ZW50cyBbIDYgMCBSIF0KL1BhcmVudCAyIDAgUgo+PgplbmRvYmoKNSAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKPj4KZW5kb2JqCjYgMCBvYmoKPDwKL0ZpbHRlciAvRmxhdGVEZWNvZGUKL0xlbmd0aCAxNzkKPj4Kc3RyZWFtCrj27qa5h68x6UZuCD9Yn8MTKdb2uedPuC3cHNmJQl5EMLg1FNx3I59HO+7Q9WcOz5aYer7v1YEznHRoq00RchSmiaVCNa9zdqz5sNsMTt1M3S7bTMzFRwnUhfaddrsVLkSSiTj3Z5JByrG2aSjhao/hSDfi8upoW6DsvdhZ8l5e9afLDdfwxsvvIbbhcU2k5Wvy3hC6/2XT8hWvbiYfLDA2k4HYkAMhXRmFKffMlQ5MSlW2CmVuZHN0cmVhbQplbmRvYmoKNyAwIG9iago8PAovVHlwZSAvUGFnZQovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9IZWx2ZXRpY2EtOTc0MjY4MjU2OCA4IDAgUgo+PgovWE9iamVjdCA8PAo+PgovRXh0R1N0YXRlIDw8Cj4+Cj4+Ci9NZWRpYUJveCBbIDAgMCA2MTIgNzkyIF0KL0Fubm90cyBbIF0KL0NvbnRlbnRzIFsgOSAwIFIgXQovUGFyZW50IDIgMCBSCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQovRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZwo+PgplbmRvYmoKOSAwIG9iago8PAovRmlsdGVyIC9GbGF0ZURlY29kZQovTGVuZ3RoIDE4MAo+PgpzdHJlYW0KmlAfgri9JZj2jK5OyaMWS8fjaSv+u1JgEBZUL0Ljby8HjXdyNiupGD8MBDYx1EBCHhF/06p4utLYVhN5EX12uWayp49vdwdqE3icoyP9ZzI+5ZXF4Ih5dhHCV89esarqiXWUZL4Rk+sijlUJdscTm7fKE3U9sOGiIpQB1xBjesCHeOLuoP+i8L5p1hbIkdBZeMjm0SHX0EFpBx6T7XyeQq5KsEFiFOESyriWXpZwzTIqX7IeCmVuZHN0cmVhbQplbmRvYmoKMTAgMCBvYmoKPDwKL1YgMgovUiAzCi9MZW5ndGggMTI4Ci9QIDIwCi9GaWx0ZXIgL1N0YW5kYXJkCi9PIDwxMWM3OTRiMjIwNTdhNmQ1ZWYwNzJjODlhYjVhODRjNWZkMDQ2MWRmMjZkMGJmM2VkYWYxY2Q1Y2FlMzdlZWYzPgovVSA8YTdmM2IyNDUwMzYxMDgwMTY5ZGMxYWFiYTQ3NzE0Y2UyOGJmNGU1ZTRlNzU4YTQxNjQwMDRlNTZmZmZhMDEwOD4KPj4KZW5kb2JqCnhyZWYKMCAxMQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDE2NiAwMDAwMCBuIAowMDAwMDAwMjMxIDAwMDAwIG4gCjAwMDAwMDAyODAgMDAwMDAgbiAKMDAwMDAwMDQ3NCAwMDAwMCBuIAowMDAwMDAwNTcxIDAwMDAwIG4gCjAwMDAwMDA4MjIgMDAwMDAgbiAKMDAwMDAwMTAxNiAwMDAwMCBuIAowMDAwMDAxMTEzIDAwMDAwIG4gCjAwMDAwMDEzNjUgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSAxMQovUm9vdCAzIDAgUgovSW5mbyAxIDAgUgovSUQgWyA8MzczMzM2MzczOTY2MzQzMTM3MzYzNzM1NjMzMTY0MzEzNjM5MzIzNTMzMzA2NDM4MzY2MzM2MzIzMDYyNjYzMD4gPDM3MzMzNjM3Mzk2NjM0MzEzNzM2MzczNTYzMzE2NDMxMzYzOTMyMzUzMzMwNjQzODM2NjMzNjMyMzA2MjY2MzA+IF0KL0VuY3J5cHQgMTAgMCBSCj4+CnN0YXJ0eHJlZgoxNTczCiUlRU9GCg==",
  "password": "JVBERi0xLjcKJeLjz9MKMSAwIG9iago8PAovUHJvZHVjZXIgPDdhMTRkYzZmNmY+Ci9DcmVhdGlvbkRhdGUgPDRlNTc5ZTNiMzkyYzRkNjZmNTE0MWVmOTJlOGVjYjIxNzk+Ci9Nb2REYXRlIDw0ZTU3OWUzYjM5MmM0ZDY2ZjUxNDFlZjkyZThlY2IyMTc5PgovVGl0bGUgPD4KPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9Db3VudCAyCi9LaWRzIFsgNCAwIFIgNyAwIFIgXQo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1Jlc291cmNlcyA8PAovRm9udCA8PAovSGVsdmV0aWNhLTcwOTg0ODA3ODkgNSAwIFIKPj4KL1hPYmplY3QgPDwKPj4KL0V4dEdTdGF0ZSA8PAo+Pgo+PgovTWVkaWFCb3ggWyAwIDAgNjEyIDc5MiBdCi9Bbm5vdHMgWyBdCi9Db250ZW50cyBbIDYgMCBSIF0KL1BhcmVudCAyIDAgUgo+PgplbmRvYmoKNSAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKPj4KZW5kb2JqCjYgMCBvYmoKPDwKL0ZpbHRlciAvRmxhdGVEZWNvZGUKL0xlbmd0aCAxNzkKPj4Kc3RyZWFtChfXe83Hvqmd/YleCD5H8RemkG4RH0rNP396NNSiE4oaPIkto69UtWqlJM5lczOUICCGLPDVMPcjRIGA0nGht9hpTbLv0fU3hud+CiXsxPadysFvJkq5jCMbXVozFJlAvNqLzfRLo/jokbpNgu0uB7dlgfq55LDFOrnhL9qFV0b6zZ6FWY2+W3q77pnC35kxP+t5aheXfIQmNISIk8EUKLNaQTKc2Ti0iOGpZidZgVLwUbCJCmVuZHN0cmVhbQplbmRvYmoKNyAwIG9iago8PAovVHlwZSAvUGFnZQovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9IZWx2ZXRpY2EtOTc0MjY4MjU2OCA4IDAgUgo+PgovWE9iamVjdCA8PAo+PgovRXh0R1N0YXRlIDw8Cj4+Cj4+Ci9NZWRpYUJveCBbIDAgMCA2MTIgNzkyIF0KL0Fubm90cyBbIF0KL0NvbnRlbnRzIFsgOSAwIFIgXQovUGFyZW50IDIgMCBSCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQovRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZwo+PgplbmRvYmoKOSAwIG9iago8PAovRmlsdGVyIC9GbGF0ZURlY29kZQovTGVuZ3RoIDE4MAo+PgpzdHJlYW0KJcSJv17xBlohL/SBfR45YjRBeyEnVZ05pVBDC1fvLmftUgbixAmPpzuXyVmsokzih2g7hs8k7d/4IkXoEPkHm4HxtuHyZTP17McNDXVYjZ+vBWU+3IK5IjOzqwFOFxVbZIXyO6dy0hP0HVaeYt+h0mee9mHdXLJ/nhCf18c88BT1h7S8YQbgV5Am1qjBhaIYJ5M0Kx70a52VzebG2MMq9UAB4mm0u4p41sc4pURJbMJETuW3CmVuZHN0cmVhbQplbmRvYmoKMTAgMCBvYmoKPDwKL1YgMgovUiAzCi9MZW5ndGggMTI4Ci9QIDIwCi9GaWx0ZXIgL1N0YW5kYXJkCi9PIDw1ZjExYjk5ODA3NGQ0MmY1ZTcyYTEyYmUyN2QzZjJhMmExNGU0OWQ2YjhlNmNmY2I3ZmJjMDBhMjg0MzI3ODczPgovVSA8Y2IzZmQ0Y2Q5MWM2OTIyNWZlZjJjOTMxYWQxNGE2NzcyOGJmNGU1ZTRlNzU4YTQxNjQwMDRlNTZmZmZhMDEwOD4KPj4KZW5kb2JqCnhyZWYKMCAxMQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDE2NiAwMDAwMCBuIAowMDAwMDAwMjMxIDAwMDAwIG4gCjAwMDAwMDAyODAgMDAwMDAgbiAKMDAwMDAwMDQ3NCAwMDAwMCBuIAowMDAwMDAwNTcxIDAwMDAwIG4gCjAwMDAwMDA4MjIgMDAwMDAgbiAKMDAwMDAwMTAxNiAwMDAwMCBuIAowMDAwMDAxMTEzIDAwMDAwIG4gCjAwMDAwMDEzNjUgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSAxMQovUm9vdCAzIDAgUgovSW5mbyAxIDAgUgovSUQgWyA8MzczMzM2MzczOTY2MzQzMTM3MzYzNzM1NjMzMTY0MzEzNjM5MzIzNTMzMzA2NDM4MzY2MzM2MzIzMDYyNjYzMD4gPDM3MzMzNjM3Mzk2NjM0MzEzNzM2MzczNTYzMzE2NDMxMzYzOTMyMzUzMzMwNjQzODM2NjMzNjMyMzA2MjY2MzA+IF0KL0VuY3J5cHQgMTAgMCBSCj4+CnN0YXJ0eHJlZgoxNTczCiUlRU9GCg==",
  "nocopy": "JVBERi0xLjcKJeLjz9MKMSAwIG9iago8PAovUHJvZHVjZXIgPDFiNTQwNjUzOWU+Ci9DcmVhdGlvbkRhdGUgPDJmMTc0NDA3YzhhNDg5NjZlYWZmOGI3N2ViNDQ3NzkyMDc+Ci9Nb2REYXRlIDwyZjE3NDQwN2M4YTQ4OTY2ZWFmZjhiNzdlYjQ0Nzc5MjA3PgovVGl0bGUgPD4KPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9Db3VudCAyCi9LaWRzIFsgNCAwIFIgNyAwIFIgXQo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1Jlc291cmNlcyA8PAovRm9udCA8PAovSGVsdmV0aWNhLTcwOTg0ODA3ODkgNSAwIFIKPj4KL1hPYmplY3QgPDwKPj4KL0V4dEdTdGF0ZSA8PAo+Pgo+PgovTWVkaWFCb3ggWyAwIDAgNjEyIDc5MiBdCi9Bbm5vdHMgWyBdCi9Db250ZW50cyBbIDYgMCBSIF0KL1BhcmVudCAyIDAgUgo+PgplbmRvYmoKNSAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKPj4KZW5kb2JqCjYgMCBvYmoKPDwKL0ZpbHRlciAvRmxhdGVEZWNvZGUKL0xlbmd0aCAxNzkKPj4Kc3RyZWFtChcs5ixvULUF5iME8n0Yf33qs2S3yi+2S7P1DnnKKeh3xC6mcQXVVIGuwhD4CK5u5xFSDBTLIG3mGASjK0JbFVNHt/Se1lElitvZBmarruAXtnMXB2+eYRrMmq5Y0ad74gBLjqOsOYlwvPkZZXToy2fDFcVu6hy6cx15wSfQ4lbOjVMYQOe4pZITJDTWDMxfBbGk66cG6CL6o214Rpi6N2QTMhP14V3P6jZNtTfmJ+95ovV7CmVuZHN0cmVhbQplbmRvYmoKNyAwIG9iago8PAovVHlwZSAvUGFnZQovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9IZWx2ZXRpY2EtOTc0MjY4MjU2OCA4IDAgUgo+PgovWE9iamVjdCA8PAo+PgovRXh0R1N0YXRlIDw8Cj4+Cj4+Ci9NZWRpYUJveCBbIDAgMCA2MTIgNzkyIF0KL0Fubm90cyBbIF0KL0NvbnRlbnRzIFsgOSAwIFIgXQovUGFyZW50IDIgMCBSCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQovRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZwo+PgplbmRvYmoKOSAwIG9iago8PAovRmlsdGVyIC9GbGF0ZURlY29kZQovTGVuZ3RoIDE4MAo+PgpzdHJlYW0KrtV4tSVSIuAuFodV1ogpFE9uyWkR9C2NMUo0NaMy99S3Ub9R3B8kiXDVZYr4EFSDWTARfya+JMv3LgDhqjN7q2uvJGx7PDLJWAWYrn/t6EPpAWLuOZT6ESPS5sTDMEzN6A2q3pNusvYM1RknLPIcsuCf5D43BqD0yynjsvYnyZrYfW4taqOiLnsh5dDZGUy5FoHkTczm7xUlqnGudet8RvzrDepts1gQwGwO8B5RkDus8ii1CmVuZHN0cmVhbQplbmRvYmoKMTAgMCBvYmoKPDwKL1YgMgovUiAzCi9MZW5ndGggMTI4Ci9QIDQKL0ZpbHRlciAvU3RhbmRhcmQKL08gPDExYzc5NGIyMjA1N2E2ZDVlZjA3MmM4OWFiNWE4NGM1ZmQwNDYxZGYyNmQwYmYzZWRhZjFjZDVjYWUzN2VlZjM+Ci9VIDw3MjA0MmNkMWU1YTFiMmNmOWYwZGExMmQ4NThlNTQzYzI4YmY0ZTVlNGU3NThhNDE2NDAwNGU1NmZmZmEwMTA4Pgo+PgplbmRvYmoKeHJlZgowIDExCjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMTY2IDAwMDAwIG4gCjAwMDAwMDAyMzEgMDAwMDAgbiAKMDAwMDAwMDI4MCAwMDAwMCBuIAowMDAwMDAwNDc0IDAwMDAwIG4gCjAwMDAwMDA1NzEgMDAwMDAgbiAKMDAwMDAwMDgyMiAwMDAwMCBuIAowMDAwMDAxMDE2IDAwMDAwIG4gCjAwMDAwMDExMTMgMDAwMDAgbiAKMDAwMDAwMTM2NSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDExCi9Sb290IDMgMCBSCi9JbmZvIDEgMCBSCi9JRCBbIDwzNzMzMzYzNzM5NjYzNDMxMzczNjM3MzU2MzMxNjQzMTM2MzkzMjM1MzMzMDY0MzgzNjYzMzYzMjMwNjI2NjMwPiA8MzczMzM2MzczOTY2MzQzMTM3MzYzNzM1NjMzMTY0MzEzNjM5MzIzNTMzMzA2NDM4MzY2MzM2MzIzMDYyNjYzMD4gXQovRW5jcnlwdCAxMCAwIFIKPj4Kc3RhcnR4cmVmCjE1NzIKJSVFT0YK",
  "noprint": "JVBERi0xLjcKJeLjz9MKMSAwIG9iago8PAovUHJvZHVjZXIgPGNlZDlkMzRjNTI+Ci9DcmVhdGlvbkRhdGUgPGZhOWE5MTE4MDQ5YTFhZjNlNWU4ODU2ZGZkYjJkZjZkNDk+Ci9Nb2REYXRlIDxmYTlhOTExODA0OWExYWYzZTVlODg1NmRmZGIyZGY2ZDQ5PgovVGl0bGUgPD4KPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9Db3VudCAyCi9LaWRzIFsgNCAwIFIgNyAwIFIgXQo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1Jlc291cmNlcyA8PAovRm9udCA8PAovSGVsdmV0aWNhLTcwOTg0ODA3ODkgNSAwIFIKPj4KL1hPYmplY3QgPDwKPj4KL0V4dEdTdGF0ZSA8PAo+Pgo+PgovTWVkaWFCb3ggWyAwIDAgNjEyIDc5MiBdCi9Bbm5vdHMgWyBdCi9Db250ZW50cyBbIDYgMCBSIF0KL1BhcmVudCAyIDAgUgo+PgplbmRvYmoKNSAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKPj4KZW5kb2JqCjYgMCBvYmoKPDwKL0ZpbHRlciAvRmxhdGVEZWNvZGUKL0xlbmd0aCAxNzkKPj4Kc3RyZWFtCoVLG/fAr5xq61QOApwnyAcw8e0w4w1wiNAj0MiZK4eiwkcdwplgsztq51sjGO6yPjZCu6kRve6j6t43oGLe6r9QDZrDMEikoLA9cubqsCi48QvzKfUVP3TI7nri/ys8J+y+JGxglaSCZUQD5vbRxpiTgV0+4u6M3Ib+KNXtHWwBMDFntK6McFbf3uPm60Rq4IawGtb7y/8n3RVScvg2i0z+nah62GJnQIFYKspmphRCp3PICmVuZHN0cmVhbQplbmRvYmoKNyAwIG9iago8PAovVHlwZSAvUGFnZQovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9IZWx2ZXRpY2EtOTc0MjY4MjU2OCA4IDAgUgo+PgovWE9iamVjdCA8PAo+PgovRXh0R1N0YXRlIDw8Cj4+Cj4+Ci9NZWRpYUJveCBbIDAgMCA2MTIgNzkyIF0KL0Fubm90cyBbIF0KL0NvbnRlbnRzIFsgOSAwIFIgXQovUGFyZW50IDIgMCBSCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQovRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZwo+PgplbmRvYmoKOSAwIG9iago8PAovRmlsdGVyIC9GbGF0ZURlY29kZQovTGVuZ3RoIDE4MAo+PgpzdHJlYW0KpUe+vQsStt7AZRFcboRuoAgVCQDDx+/YqAAieHdjSKp+QdUNV2gwNu3qs4+VWzafaI4BkrNQWdji6cnlv/Z6efOzhotfJHQSk9zUoZlCgKJAhPbmY3NBZD/+PFKhHFjqhS4/uvQnxiAy+I9m5swAPKJZquFkifSy0ZdCqNkGY5itLjxzO8XcT5uyDPZySqJnBdQcJFJlCMdQsbhmIIMSK7m590IX7wKdcoNAqHkLUA1mU0H8CmVuZHN0cmVhbQplbmRvYmoKMTAgMCBvYmoKPDwKL1YgMgovUiAzCi9MZW5ndGggMTI4Ci9QIDE2Ci9GaWx0ZXIgL1N0YW5kYXJkCi9PIDwxMWM3OTRiMjIwNTdhNmQ1ZWYwNzJjODlhYjVhODRjNWZkMDQ2MWRmMjZkMGJmM2VkYWYxY2Q1Y2FlMzdlZWYzPgovVSA8NTNhN2IzMWE5NWMxOTNmZjQ2OGUzODdkMjVmYzc3YWEyOGJmNGU1ZTRlNzU4YTQxNjQwMDRlNTZmZmZhMDEwOD4KPj4KZW5kb2JqCnhyZWYKMCAxMQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDE2NiAwMDAwMCBuIAowMDAwMDAwMjMxIDAwMDAwIG4gCjAwMDAwMDAyODAgMDAwMDAgbiAKMDAwMDAwMDQ3NCAwMDAwMCBuIAowMDAwMDAwNTcxIDAwMDAwIG4gCjAwMDAwMDA4MjIgMDAwMDAgbiAKMDAwMDAwMTAxNiAwMDAwMCBuIAowMDAwMDAxMTEzIDAwMDAwIG4gCjAwMDAwMDEzNjUgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSAxMQovUm9vdCAzIDAgUgovSW5mbyAxIDAgUgovSUQgWyA8MzczMzM2MzczOTY2MzQzMTM3MzYzNzM1NjMzMTY0MzEzNjM5MzIzNTMzMzA2NDM4MzY2MzM2MzIzMDYyNjYzMD4gPDM3MzMzNjM3Mzk2NjM0MzEzNzM2MzczNTYzMzE2NDMxMzYzOTMyMzUzMzMwNjQzODM2NjMzNjMyMzA2MjY2MzA+IF0KL0VuY3J5cHQgMTAgMCBSCj4+CnN0YXJ0eHJlZgoxNTczCiUlRU9GCg==",
  "spoof": "JVBERi0xLjcKJeLjz9MKMSAwIG9iago8PAovUHJvZHVjZXIgPDAzMTE4YWVkMmU+Ci9DcmVhdGlvbkRhdGUgPDM3NTJjOGI5NzgzYjZlNjU5YjI0Y2M1NmQxMzBjYzEyMTQ+Ci9Nb2REYXRlIDwzNzUyYzhiOTc4M2I2ZTY1OWIyNGNjNTZkMTMwY2MxMjE0PgovVGl0bGUgPDM1MDk5MWVjNjg2MzNiMzVjZjcwOGU2Y2E0NmU5ZjUwMzdlZjI4MGQwNzNmYmU5MzI4MjEzZTQxNDNkZDAxNTBkZTU0NzVmZTUxYTQ3NTFhZmMwMTU0OGZjNTRiOWY0MWFiZWY0NTJlMjRmN2JmNmU2NDJhZDhmMTg1N2M0MzBmNjhjMzBhNTAyNDc0NjEwNTQ4Zjk5MTk4Yzc1NGYwNDA5YWM4ZjE+Cj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovQ291bnQgMgovS2lkcyBbIDQgMCBSIDcgMCBSIF0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iago0IDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0hlbHZldGljYS03MDk4NDgwNzg5IDUgMCBSCj4+Ci9YT2JqZWN0IDw8Cj4+Ci9FeHRHU3RhdGUgPDwKPj4KPj4KL01lZGlhQm94IFsgMCAwIDYxMiA3OTIgXQovQW5ub3RzIFsgXQovQ29udGVudHMgWyA2IDAgUiBdCi9QYXJlbnQgMiAwIFIKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCi9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nCj4+CmVuZG9iago2IDAgb2JqCjw8Ci9GaWx0ZXIgL0ZsYXRlRGVjb2RlCi9MZW5ndGggMTc5Cj4+CnN0cmVhbQqIFBAndrKqsUQc3a8PMnmSGg/9Cl/MFju7+AM0SZhVQKFywPFNX8BOqnhaLMspbBYE4GgifeCroSqwauPpHKrw9eLq1fqKZIFhFvTUqz3CUWRMlR8Tt1fVCDQiKut92BtdrF7rcHCElu3FCkVDkpXsMwaAXarZzP+shhpslMZ4Aer9tMC7hAkO14ZFcmQBG+R052n3HaKEf/4/kf4cBt+Q8swLpA39gV9aQGWpteqX8fxCjgplbmRzdHJlYW0KZW5kb2JqCjcgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1Jlc291cmNlcyA8PAovRm9udCA8PAovSGVsdmV0aWNhLTk3NDI2ODI1NjggOCAwIFIKPj4KL1hPYmplY3QgPDwKPj4KL0V4dEdTdGF0ZSA8PAo+Pgo+PgovTWVkaWFCb3ggWyAwIDAgNjEyIDc5MiBdCi9Bbm5vdHMgWyBdCi9Db250ZW50cyBbIDkgMCBSIF0KL1BhcmVudCAyIDAgUgo+PgplbmRvYmoKOCAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKPj4KZW5kb2JqCjkgMCBvYmoKPDwKL0ZpbHRlciAvRmxhdGVEZWNvZGUKL0xlbmd0aCAxODAKPj4Kc3RyZWFtCnx08MJ/DawkjgGVeDSz79jhuduDXjCWS5u4QTd2AwK6zL89j8jtYicWNuEb2YBIgdAgxgL0zgnmhp+EBfZ9+bwGjLQbiQLzYT24iNzFX3v6Qa/hC/cx4c4yNSge/8KqvbmHKNS0VewUevrHcoknVCS6wjnvbC4WyBEuYylBLk4UfnWmUQFzlH8dGeZ7c15jxDzBPwUMSrYv6NT5NYQ8OO5r46G/mPzYHUjP163D+ezuamObdwplbmRzdHJlYW0KZW5kb2JqCjEwIDAgb2JqCjw8Ci9WIDIKL1IgMwovTGVuZ3RoIDEyOAovUCAyMAovRmlsdGVyIC9TdGFuZGFyZAovTyA8MTFjNzk0YjIyMDU3YTZkNWVmMDcyYzg5YWI1YTg0YzVmZDA0NjFkZjI2ZDBiZjNlZGFmMWNkNWNhZTM3ZWVmMz4KL1UgPDBmYWRlZmQ4N2Q5MTcxMmJhZjM2ZWRlZmNmZDliNmVkMjhiZjRlNWU0ZTc1OGE0MTY0MDA0ZTU2ZmZmYTAxMDg+Cj4+CmVuZG9iagp4cmVmCjAgMTEKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAzMzIgMDAwMDAgbiAKMDAwMDAwMDM5NyAwMDAwMCBuIAowMDAwMDAwNDQ2IDAwMDAwIG4gCjAwMDAwMDA2NDAgMDAwMDAgbiAKMDAwMDAwMDczNyAwMDAwMCBuIAowMDAwMDAwOTg4IDAwMDAwIG4gCjAwMDAwMDExODIgMDAwMDAgbiAKMDAwMDAwMTI3OSAwMDAwMCBuIAowMDAwMDAxNTMxIDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgMTEKL1Jvb3QgMyAwIFIKL0luZm8gMSAwIFIKL0lEIFsgPDYxMzkzNTY0MzE2NDM2NjY2NDMyNjUzNjM3MzYzMDYxNjQzMDM1MzQzOTYzNjU2MTMzMzkzODMxMzg2NjMyMzY+IDw2MTM5MzU2NDMxNjQzNjY2NjQzMjY1MzYzNzM2MzA2MTY0MzAzNTM0Mzk2MzY1NjEzMzM5MzgzMTM4NjYzMjM2PiBdCi9FbmNyeXB0IDEwIDAgUgo+PgpzdGFydHhyZWYKMTczOQolJUVPRgo="
});
const LETTER = 'Morgan Fiction\n12 Example Street\nHalifax NS B3H 0A0\n\nOctober 9, 2026\n\nCredit bureau\nConsumer account: FICTIONAL-REF-001\n\nDear credit bureau,\n\nPlease check the two collection entries from Cedar Agency and Maple Agency. Both show account ****1234 for the same debt. Please correct the duplicate.\n\nMy report shows both entries on page 2. I have included that page and copies of my identification and proof of address.\n\nThank you,\nMorgan Fiction';
async function document(lines, formControls = false) {
  const doc = await lib.PDFDocument.create({ updateMetadata: false });
  doc.setCreationDate(new Date('2000-01-01T00:00:00Z')); doc.setModificationDate(new Date('2000-01-01T00:00:00Z'));
  for (const [index, line] of lines.entries()) { const page = doc.addPage([612, 792]); page.drawText(line, { x: 40, y: 700, size: 12 }); page.drawRectangle({ x: 40, y: 640, width: 80 + index * 20, height: 20, color: lib.rgb(.1, .3, .5) }); }
  if (formControls) {
    const form = doc.getForm(), page = doc.getPage(0);
    const text = form.createTextField('Name'); text.setText('Original consumer'); text.setMaxLength(80); text.addToPage(page, { x: 40, y: 590, width: 250, height: 25 });
    const dropdown = form.createDropdown('Province'); dropdown.addOptions(['NS', 'QC', 'ON']); dropdown.select('NS'); dropdown.addToPage(page, { x: 40, y: 550, width: 150, height: 25 });
    const radio = form.createRadioGroup('Delivery'); radio.addOptionToPage('Mail', page, { x: 40, y: 510, width: 20, height: 20 }); radio.addOptionToPage('Email', page, { x: 85, y: 510, width: 20, height: 20 }); radio.select('Mail');
    form.createCheckBox('Consent').addToPage(page, { x: 40, y: 475, width: 20, height: 20 });
    form.createOptionList('Reasons').addToPage(page, { x: 40, y: 390, width: 200, height: 60 }); form.getOptionList('Reasons').addOptions(['Duplicate', 'Balance']); form.getOptionList('Reasons').select('Duplicate');
    const signature = doc.context.obj({ Type: 'Annot', Subtype: 'Widget', FT: 'Sig', T: lib.PDFHexString.fromText('Signature'), Rect: [40, 350, 250, 380], P: page.ref });
    const sigRef = doc.context.register(signature); page.node.addAnnot(sigRef); form.acroForm.addField(sigRef);
    const action = doc.context.obj({ S: 'JavaScript', JS: lib.PDFString.of('app.alert("not allowed")') });
    doc.catalog.set(n('OpenAction'), doc.context.register(action)); text.acroField.dict.set(n('AA'), doc.context.obj({ K: action }));
  }
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}
function streams(doc, page) {
  const contents = page.node.lookup(n('Contents'));
  return (contents instanceof lib.PDFArray ? contents.asArray() : [contents]).map(ref => doc.context.lookup(ref)).filter(value => value instanceof lib.PDFRawStream).map(value => Buffer.from(value.getContents()));
}
function render(bytes, page) {
  return execFileSync('pdftoppm', ['-f', String(page), '-l', String(page), '-scale-to', '900', '-png', '-singlefile', '-'], { input: bytes, timeout: 30000, maxBuffer: 8 * 1024 * 1024, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
}
function refuses(check, input, description, code = 'INVALID_REQUEST') { let caught; try { composePacket(input); } catch (error) { caught = error; } check.equal(caught?.code, code, description); }

function coldWorker(input) {
  return JSON.parse(execFileSync(process.execPath, [path.join(__dirname, '../../packet-composer-worker.cjs')], {
    input: JSON.stringify(input), encoding: 'utf8', timeout: 45000, maxBuffer: 128 * 1024 * 1024,
    windowsHide: true, stdio: ['pipe', 'pipe', 'pipe']
  }));
}
function rasterDifference(first, second, firstPage = 1, secondPage = 1) {
  const raster = (bytes, page) => {
    const ppm = execFileSync('pdftoppm', ['-f', String(page), '-l', String(page), '-r', '96', '-singlefile', '-'], { input: bytes, timeout: 30000, maxBuffer: 8 * 1024 * 1024, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const header = ppm.subarray(0, 80).toString('ascii').match(/^P6\r?\n(\d+) (\d+)\r?\n255\r?\n/);
    if (!header) throw new Error('RASTER_FORMAT');
    return { width: Number(header[1]), height: Number(header[2]), pixels: ppm.subarray(header[0].length) };
  };
  const a = raster(first, firstPage), b = raster(second, secondPage);
  if (a.width !== b.width || a.height !== b.height || a.pixels.length !== b.pixels.length) return { equal_dimensions: false };
  let absolute = 0, substantial = 0, ink = 0, changedInk = 0;
  for (let at = 0; at < a.pixels.length; at += 3) {
    let maximum = 0;
    for (let channel = 0; channel < 3; channel++) { const difference = Math.abs(a.pixels[at + channel] - b.pixels[at + channel]); absolute += difference; maximum = Math.max(maximum, difference); }
    if (maximum > 32) substantial++;
    if (Math.min(a.pixels[at], a.pixels[at + 1], a.pixels[at + 2]) < 220) { ink++; if (maximum > 32) changedInk++; }
  }
  return { equal_dimensions: true, mean_absolute_rgb: absolute / a.pixels.length, substantial_pixel_fraction: substantial / (a.width * a.height), changed_ink_fraction: changedInk / Math.max(1, ink) };
}
const artworkMatches = difference => difference.equal_dimensions && difference.mean_absolute_rgb <= 1 && difference.substantial_pixel_fraction <= .01 && difference.changed_ink_fraction <= .20;
function isolatedWorker(exec) {
  // Substitute only local process results to exercise malformed permission output and
  // expansion bounds without allocating or persisting large consumer attachments.
  const filename = path.join(__dirname, '../../packet-composer-worker.cjs'), worker = new Module(filename, module);
  worker.filename = filename; worker.paths = Module._nodeModulePaths(path.dirname(filename));
  worker.require = request => request === 'node:child_process' ? { execFileSync: exec } : Module.prototype.require.call(worker, request);
  worker._compile(fs.readFileSync(filename, 'utf8'), filename);
  return worker.exports;
}
async function encryptedEvidenceChecks(check, form) {
  const allowed = Buffer.from(ENCRYPTED_FIXTURES.allowed, 'base64'), originalHash = hash(allowed);
  const recipe = { letter_text: LETTER, reports: [{ bytes: allowed, content_type: 'application/pdf', relevant_pages: [2], label: 'Fictional encrypted report' }], forms: [{ bytes: form, filename: 'original-bureau.pdf' }] };
  const packet = composePacket(recipe), doc = await lib.PDFDocument.load(packet.bytes);
  check.deepEqual(packet.sections.map(section => section.kind), ['letter', 'report', 'form'], 'permitted encrypted source keeps the same complete-packet order');
  check.deepEqual(packet.sections.find(section => section.kind === 'report').source_pages, [2], 'permitted encrypted report preserves the original selected one-based source page');
  check.ok(pdfText(packet.bytes).includes('FICTIONAL ENCRYPTED PAGE 2 SELECTED EVIDENCE') && !pdfText(packet.bytes).includes('FICTIONAL ENCRYPTED PAGE 1 NOT SELECTED'), 'only the relevant encrypted source page prints, never the whole report');
  check.equal(hash(allowed), originalHash, 'local permitted copying leaves the original uploaded encrypted bytes unchanged');
  check.ok(!doc.isEncrypted && doc.getPageCount() === 3, 'permitted evidence produces a readable complete PDF with no omitted pages');
  check.deepEqual(doc.getPage(1).getSize(), { width: 612, height: 792 }, 'permitted encrypted evidence retains source page dimensions');
  check.ok(!doc.getForm().getTextField('CRP_letter_page_1').isReadOnly(), 'letter remains genuinely editable alongside permitted encrypted evidence');
  check.deepEqual(doc.getForm().getDropdown('Province').getOptions(), ['NS', 'QC', 'ON'], 'permitted-copy path preserves the original bureau dropdown controls');
  check.ok(!doc.getForm().getCheckBox('Consent').isChecked() && !doc.getForm().getSignature('Signature').acroField.dict.has(n('V')), 'native bureau consent and signature stay blank with encrypted evidence');
  check.ok(render(form, 1).equals(render(packet.bytes, 3)), 'permitted-copy path leaves bureau form artwork and saved fields visually identical');
  const support = composePacket({ letter_text: LETTER, documents: [{ bytes: allowed, content_type: 'application/pdf', label: 'Fictional supporting copy' }] });
  check.equal(support.page_count, 3, 'print/copy permitted encrypted support includes every original support page');
  check.deepEqual(support.sections[1].source_pages, [1, 2], 'support copy page order is preserved');
  check.ok(pdfText(support.bytes).includes('FICTIONAL ENCRYPTED PAGE 1 NOT SELECTED') && pdfText(support.bytes).includes('FICTIONAL ENCRYPTED PAGE 2 SELECTED EVIDENCE'), 'both support pages remain readable in the final packet');
  // Rendering the exact single page through an independent renderer provides a bounded
  // appearance comparison; Cairo can change antialiasing, never content or geometry.
  const originalDoc = await lib.PDFDocument.load(allowed, { ignoreEncryption: true, updateMetadata: false });
  const converted = execFileSync('pdftocairo', ['-upw', '', '-pdf', '-', '-'], { input: allowed, timeout: 20000, maxBuffer: 64 * 1024 * 1024, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  const convertedDoc = await lib.PDFDocument.load(converted);
  const difference = rasterDifference(allowed, packet.bytes, 2, 2);
  check.ok(artworkMatches(difference), 'actual selected final packet page retains the original selected encrypted source artwork and visible ink within a small measured renderer tolerance');
  const selectedText = execFileSync('pdftotext', ['-f', '2', '-l', '2', '-layout', '-', '-'], { input: allowed, timeout: 30000, maxBuffer: 1024 * 1024, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }).toString('utf8');
  const finalSelectedText = execFileSync('pdftotext', ['-f', '2', '-l', '2', '-layout', '-', '-'], { input: packet.bytes, timeout: 30000, maxBuffer: 1024 * 1024, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }).toString('utf8');
  check.equal(comparableText(finalSelectedText), comparableText(selectedText), 'all actually selected visible source text survives conversion into the final packet');
  const missingText = await lib.PDFDocument.create({ updateMetadata: false }); missingText.addPage([612, 792]).drawRectangle({ x: 40, y: 640, width: 120, height: 20, color: lib.rgb(.1, .3, .5) });
  const missingTextBytes = Buffer.from(await missingText.save());
  check.ok(!artworkMatches(rasterDifference(allowed, missingTextBytes, 2, 1)), 'artwork comparison catches a missing visible text row even when the sparse-page white background and colored rectangle match');
  check.ok(!artworkMatches(rasterDifference(allowed, await document(['']), 2, 1)), 'artwork comparison refuses incomplete sparse evidence pages instead of hiding omissions in whole-page averages');
  check.equal(originalDoc.getPageCount(), convertedDoc.getPageCount(), 'permission copy retains the complete source page inventory before selecting evidence');
  for (const variant of ['password', 'nocopy', 'noprint']) {
    const bytes = Buffer.from(ENCRYPTED_FIXTURES[variant], 'base64');
    refuses(check, { letter_text: LETTER, reports: [{ bytes, content_type: 'application/pdf', relevant_pages: [2] }] }, 'encrypted report refuses ' + variant + ' instead of bypassing protection', 'PACKET_ATTACHMENT_UNREADABLE');
    refuses(check, { letter_text: LETTER, documents: [{ bytes, content_type: 'application/pdf' }] }, 'encrypted support copy refuses ' + variant + ' instead of being silently omitted', 'PACKET_ATTACHMENT_UNREADABLE');
  }
  refuses(check, { letter_text: LETTER, forms: [{ bytes: allowed, filename: 'encrypted-original.pdf' }] }, 'even print/copy permitted bureau originals remain strict and are never converted', 'SERVICE_STATE_UNAVAILABLE');
  refuses(check, { letter_text: LETTER, reports: [{ bytes: allowed, content_type: 'application/pdf', relevant_pages: [3] }] }, 'permitted encryption cannot relax exact in-range source-page requirements');
  const coldInput = { letter_text: LETTER, reports: [{ ...recipe.reports[0], bytes: allowed.toString('base64') }], forms: [{ bytes: form.toString('base64'), filename: 'original-bureau.pdf' }], version: VERSION };
  const first = coldWorker(coldInput); await new Promise(resolve => setTimeout(resolve, 1200)); const second = coldWorker(coldInput);
  check.equal(first.bytes, second.bytes, 'separate uncached copies more than one second apart normalize converter dates/IDs and produce identical final approval bytes');
  check.equal(first.sha256, hash(packet.bytes), 'cold permitted-copy output exactly matches preview/download output and approval digest');
  const info = execFileSync('pdfinfo', ['-upw', '', '-'], { input: allowed, timeout: 20000, maxBuffer: 1024 * 1024, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }).toString('utf8');
  for (const modifiedInfo of [info + '\nEncrypted: yes (print:yes copy:yes change:no addNotes:no algorithm:RC4)\n', info.replace(/^Encrypted:.*$/m, 'Encrypted: maybe (print:yes copy:yes)')]) {
    let copies = 0, error;
    const worker = isolatedWorker((command, args, options) => { if (command === 'pdfinfo') return Buffer.from(modifiedInfo); copies++; return execFileSync(command, args, options); });
    try { await worker.compose(coldInput); } catch (caught) { error = caught; }
    check.equal(error?.code, 'PACKET_ATTACHMENT_UNREADABLE', 'duplicate or unrecognized permission output cannot grant permission');
    check.equal(copies, 0, 'ambiguous permission metadata is refused before any copy');
  }
  const noCopy = Buffer.from(ENCRYPTED_FIXTURES.nocopy, 'base64'), falsePermission = info;
  let spoofedCopies = 0, spoofedError;
  try { await isolatedWorker((command, args, options) => { if (command === 'pdfinfo') return Buffer.from(falsePermission); spoofedCopies++; return execFileSync(command, args, options); }).compose({ ...coldInput, reports: [{ bytes: noCopy.toString('base64'), content_type: 'application/pdf', relevant_pages: [2] }] }); } catch (caught) { spoofedError = caught; }
  check.equal(spoofedError?.code, 'PACKET_ATTACHMENT_UNREADABLE', 'a spoofed allowed permission line cannot override actual encrypted PDF permission bits');
  check.equal(spoofedCopies, 0, 'withheld copy permission is refused before conversion even with a spoofed tool line');
  // Two small genuine encrypted inputs each expanding to an otherwise valid 33 MiB
  // conversion would breach the shared 64 MiB copy budget although neither alone does.
  const expanded = Buffer.alloc(33 * 1024 * 1024, 32); converted.copy(expanded);
  let expansionError, conversions = 0;
  const expansionWorker = isolatedWorker((command, args, options) => { if (command === 'pdfinfo') return Buffer.from(info); conversions++; return expanded; });
  try { await expansionWorker.compose({ letter_text: LETTER, reports: [1, 2].map(() => ({ bytes: allowed.toString('base64'), content_type: 'application/pdf', relevant_pages: [2] })), version: VERSION }); } catch (caught) { expansionError = caught; }
  check.equal(expansionError?.code, 'INVALID_REQUEST', 'multiple permitted evidence copies cannot collectively exceed the conversion byte budget');
  check.equal(conversions, 2, 'aggregate expansion control exercises two individually valid-size copies rather than a per-file rejection');
  let pageBudgetError, pageConversions = 0;
  const pageWorker = isolatedWorker(command => { if (command === 'pdfinfo') return Buffer.from(info); pageConversions++; return converted; });
  try { await pageWorker.compose({ letter_text: LETTER, reports: Array.from({ length: 201 }, () => ({ bytes: allowed.toString('base64'), content_type: 'application/pdf', relevant_pages: [2] })), version: VERSION }); } catch (caught) { pageBudgetError = caught; }
  check.equal(pageBudgetError?.code, 'INVALID_REQUEST', 'many individually small copies cannot collectively expand past the 400-page conversion budget even when selected output pages would fit');
  check.equal(pageConversions, 200, 'shared source-page expansion limit refuses the next copy before conversion or page import');
  refuses(check, { letter_text: LETTER, documents: [1, 2].map(() => ({ bytes: Buffer.alloc(33 * 1024 * 1024), content_type: 'application/pdf' })) }, 'original aggregate upload limit still applies before invoking a worker');
}

async function run(t, check) {
  const report = await document(['REPORT PAGE 1 NOT RELEVANT', 'REPORT PAGE 2 CEDAR AND MAPLE COLLECTIONS', 'REPORT PAGE 3 NOT RELEVANT', 'REPORT PAGE 4 SUPPORTING AMOUNT']);
  const address = await document(['FICTIONAL PROOF OF ADDRESS']);
  // A valid local PNG fixture is deliberately reused as both an image report and an identification copy.
  const png = render(await document(['FICTIONAL PHOTO IDENTIFICATION']), 1);
  const form = await document(['ORIGINAL BUREAU ARTWORK'], true);
  const input = { letter_text: LETTER, reports: [{ bytes: report, content_type: 'application/pdf', relevant_pages: [4, 2, 2], label: 'Relevant report pages' }],
    documents: [{ bytes: png, content_type: 'image/png', label: 'Identification' }, { bytes: address, content_type: 'application/pdf', label: 'Proof of address' }],
    forms: [{ bytes: form, filename: 'bureau-one.pdf' }, { bytes: form, filename: 'bureau-two.pdf' }] };
  const packet = composePacket(input), repeat = composePacket(input), loaded = await lib.PDFDocument.load(packet.bytes);
  check.equal(packet.version, VERSION, 'actual output is bound to the wrapper, worker, fonts and local PDF library version');
  check.equal(packet.sha256, hash(packet.bytes), 'approval digest describes the actual single complete PDF');
  check.ok(packet.bytes.equals(repeat.bytes), 'unchanged recipe renders byte-identically for review, approval and download');
  repeat.bytes[0] = 0; repeat.sections[0].label = 'mutated caller value';
  const protectedRepeat = composePacket(input);
  check.ok(protectedRepeat.bytes.equals(packet.bytes) && protectedRepeat.sections[0].label === 'My dispute letter', 'caller mutation cannot corrupt cached approved bytes or metadata');
  check.notEqual(composePacket({ ...input, letter_text: LETTER.replace('Please correct the duplicate.', 'Please remove the duplicate.') }).sha256, packet.sha256, 'an edited letter gets a new output rather than a cached earlier approval');
  check.equal(packet.page_count, 7, 'single packet contains one letter, two relevant pages, two copies and two original forms');
  check.deepEqual(packet.sections.map(section => [section.kind, section.start_page, section.page_count]), [['letter', 1, 1], ['report', 2, 2], ['document', 4, 1], ['document', 5, 1], ['form', 6, 1], ['form', 7, 1]], 'single PDF follows letter, source evidence, identification/address and bureau form order');
  check.deepEqual(packet.sections[1].source_pages, [2, 4], 'relevant pages are unique and retain their original report order');
  const text = pdfText(packet.bytes);
  check.ok(text.includes('REPORT PAGE 2') && text.includes('REPORT PAGE 4') && !text.includes('REPORT PAGE 1') && !text.includes('REPORT PAGE 3'), 'irrelevant source report pages are absent from the actual printable packet');
  check.ok(text.includes('Consumer account: FICTIONAL-REF-001'), 'supplied bureau consumer account number is printed on the letter');
  check.ok(!text.includes('Print and mail') && !text.includes('Evidence References'), 'composer adds no mailing instructions or separate technical evidence-reference sheet');
  check.equal(comparableText(loaded.getForm().getTextField('CRP_letter_page_1').getText()), comparableText(LETTER), 'ordinary complete letter is a genuine editable PDF text field');
  check.ok(packet.editable_fields.find(field => field.section === 'letter').font_size >= 10, 'letter text remains at least 10 points');
  const original = await lib.PDFDocument.load(form);
  for (const page of [5, 6]) {
    const originalStreams = streams(original, original.getPage(0)), finalStreams = streams(loaded, loaded.getPage(page));
    check.ok(originalStreams.every(source => finalStreams.some(copy => copy.equals(source))), 'native bureau page artwork streams remain unchanged: ' + (page + 1));
    check.ok(render(form, 1).equals(render(packet.bytes, page + 1)), 'independent printed rendering of native bureau artwork and saved controls is unchanged: ' + (page + 1));
  }
  for (const prefix of ['', 'bureau_form_2.']) {
    const finalForm = loaded.getForm();
    check.equal(finalForm.getTextField(prefix + 'Name').getText(), 'Original consumer', 'each same-name native text value survives merging: ' + prefix);
    check.equal(finalForm.getTextField(prefix + 'Name').getMaxLength(), 80, 'native field constraints survive: ' + prefix);
    check.deepEqual(finalForm.getDropdown(prefix + 'Province').getOptions(), ['NS', 'QC', 'ON'], 'native dropdown options survive: ' + prefix);
    check.deepEqual(finalForm.getDropdown(prefix + 'Province').getSelected(), ['NS'], 'native selected dropdown survives: ' + prefix);
    check.deepEqual(finalForm.getRadioGroup(prefix + 'Delivery').getOptions(), ['Mail', 'Email'], 'native radio export options survive: ' + prefix);
    check.equal(finalForm.getRadioGroup(prefix + 'Delivery').getSelected(), 'Mail', 'native radio selection survives: ' + prefix);
    check.deepEqual(finalForm.getOptionList(prefix + 'Reasons').getSelected(), ['Duplicate'], 'native option-list selection survives: ' + prefix);
    check.equal(finalForm.getCheckBox(prefix + 'Consent').isChecked(), false, 'blank consumer consent remains blank: ' + prefix);
    check.ok(finalForm.getSignature(prefix + 'Signature') instanceof lib.PDFSignature && !finalForm.getSignature(prefix + 'Signature').acroField.dict.has(n('V')), 'native signature field remains blank and available: ' + prefix);
  }
  check.ok(!loaded.catalog.has(n('OpenAction')) && loaded.getForm().getFields().every(field => !field.acroField.dict.has(n('AA'))), 'untrusted imported executable actions are removed');
  const finalForm = loaded.getForm();
  finalForm.getTextField('CRP_letter_page_1').setText('Morgan Fiction\n\nPlease correct the duplicate collection.\n\nThank you,\nMorgan Fiction');
  finalForm.getTextField('Name').setText('Changed first form'); finalForm.getTextField('bureau_form_2.Name').setText('Changed second form');
  finalForm.getDropdown('Province').select('QC'); finalForm.getDropdown('bureau_form_2.Province').select('ON');
  finalForm.getRadioGroup('bureau_form_2.Delivery').select('Email');
  loaded.registerFontkit(fontkit);
  const editFont = await loaded.embedFont(fs.readFileSync(path.join(__dirname, '../../packet-fonts/NotoSans-Regular.ttf')), { subset: false });
  finalForm.getTextField('CRP_letter_page_1').updateAppearances(editFont);
  const saved = Buffer.from(await loaded.save({ useObjectStreams: false })), reloaded = (await lib.PDFDocument.load(saved)).getForm();
  check.equal(reloaded.getTextField('Name').getText(), 'Changed first form', 'saved first form edit remains independent');
  check.equal(reloaded.getTextField('bureau_form_2.Name').getText(), 'Changed second form', 'saved second form edit remains independent');
  check.deepEqual(reloaded.getDropdown('Province').getSelected(), ['QC'], 'consumer can change native dropdown and save');
  check.deepEqual(reloaded.getDropdown('bureau_form_2.Province').getSelected(), ['ON'], 'same-name second native dropdown remains independently editable');
  check.equal(reloaded.getRadioGroup('bureau_form_2.Delivery').getSelected(), 'Email', 'consumer can change native radio and save');
  check.ok(pdfText(saved).includes('Please correct the duplicate collection.') && !pdfText(saved).includes('both entries on page 2'), 'saved letter edit changes the actual printable appearance');
  check.ok(!render(packet.bytes, 1).equals(render(saved, 1)), 'independent renderer prints the saved edited letter');
  check.ok(render(packet.bytes, 2).equals(render(saved, 2)), 'letter and form edits leave the source evidence page unchanged');
  const longLetter = 'Morgan Fiction\n\n' + Array.from({ length: 180 }, (_, index) => `Item ${index + 1}: Please check the two collection entries and correct the duplicate account. The same masked number is printed on both entries.`).join('\n\n') + '\n\nThank you,\nMorgan Fiction';
  const long = composePacket({ letter_text: longLetter }), longDoc = await lib.PDFDocument.load(long.bytes);
  check.ok(long.page_count > 1, 'a long letter has clean continuation pages instead of clipping or smaller type');
  check.ok(long.editable_fields.every(field => field.font_size >= 10), 'every long-letter page remains at least 10 points');
  check.equal(comparableText(long.editable_fields.map(field => longDoc.getForm().getTextField(field.name).getText()).join(' ')), comparableText(longLetter), 'all long-letter text survives editable pagination');
  const longText = comparableText(pdfText(long.bytes));
  check.ok(longText.includes('Item 1:') && longText.includes('Item 180:') && longText.endsWith('Morgan Fiction'), 'first and last long-letter content print without truncation');
  for (const field of long.editable_fields) {
    const widget = longDoc.getForm().getTextField(field.name).acroField.getWidgets()[0], rectangle = widget.getRectangle();
    check.ok(rectangle.y >= 40 && rectangle.y + rectangle.height <= 752, 'continuation letter text remains within printable page margins: ' + field.page);
  }
  const imageReport = composePacket({ letter_text: LETTER, reports: [{ bytes: png, content_type: 'image/png', relevant_pages: [1] }] });
  check.equal(imageReport.page_count, 2, 'single-page image report is included inline as the exact relevant source');
  check.ok((await lib.PDFDocument.load(imageReport.bytes)).getPage(1).node.Resources().lookup(n('XObject'), lib.PDFDict).keys().length > 0, 'image evidence is actually embedded, not an external file reference');
  const interactiveReport = composePacket({ letter_text: LETTER, reports: [{ bytes: form, content_type: 'application/pdf', relevant_pages: [1] }] });
  check.ok((await lib.PDFDocument.load(interactiveReport.bytes)).getForm().getFields().every(field => field.getName().startsWith('CRP_letter')), 'report form values are frozen as evidence, never consumer-editable report facts');
  check.ok(pdfText(interactiveReport.bytes).includes('Original consumer'), 'frozen original report values still print');
  for (const pages of [undefined, [], [0], [-1], [1.5], [5]]) refuses(check, { letter_text: LETTER, reports: [{ bytes: report, content_type: 'application/pdf', relevant_pages: pages }] }, 'missing or invalid relevant source pages cannot silently include the whole report: ' + JSON.stringify(pages));
  refuses(check, { letter_text: LETTER, reports: [{ bytes: png, content_type: 'image/png', relevant_pages: [2] }] }, 'image source refuses an invented page number');
  refuses(check, { letter_text: LETTER, documents: [{ bytes: Buffer.from('%PDF-1.7\ninvalid'), content_type: 'application/pdf' }] }, 'damaged support PDF cannot silently disappear from the complete packet', 'PACKET_ATTACHMENT_UNREADABLE');
  refuses(check, { letter_text: LETTER, forms: [{ bytes: Buffer.from('%PDF-1.7\ninvalid') }] }, 'damaged bureau PDF cannot produce a partial packet', 'SERVICE_STATE_UNAVAILABLE');
  refuses(check, { letter_text: LETTER, documents: [{ bytes: png, content_type: 'image/gif' }] }, 'unsupported document type is refused rather than omitted');
  const tu = bureauForms.materialForms('CA', 'TRANSUNION', 'ACCOUNT')[0], native = bureauForms.populateForm(tu, { profile: { given_name: 'Morgan', family_name: 'Fiction', region: 'NS' }, items: [{ name: 'Cedar Agency', account_reference: '****1234', request: 'Please correct the duplicate entry.' }], settings: {} });
  const nativePacket = composePacket({ letter_text: LETTER, forms: [{ bytes: native.bytes, filename: tu.filename }] }), nativeForm = (await lib.PDFDocument.load(nativePacket.bytes)).getForm();
  check.deepEqual(nativeForm.getDropdown('Prov1').getOptions(), (await lib.PDFDocument.load(native.bytes)).getForm().getDropdown('Prov1').getOptions(), 'actual completed original TransUnion dropdown options survive final packet creation');
  check.equal(nativeForm.getRadioGroup('request that it be incorporated into').getSelected(), undefined, 'actual original bureau consent stays unselected in final packet');
  check.equal(nativeForm.getTextField('Signature').getText(), undefined, 'actual original bureau consumer signature stays blank in final packet');
  check.ok(render(native.bytes, 1).equals(render(nativePacket.bytes, 2)), 'actual completed bureau form page remains visually identical in the single packet');
  const nativePair = composePacket({ letter_text: LETTER, forms: [{ bytes: native.bytes, filename: tu.filename }, { bytes: native.bytes, filename: tu.filename }] });
  const pairForm = (await lib.PDFDocument.load(nativePair.bytes)).getForm();
  check.equal(pairForm.getTextField('bureau_form_2.Account1').getText(), '****1234', 'a second actual original bureau form retains its independently editable account value');
  check.deepEqual(pairForm.getDropdown('bureau_form_2.Prov1').getOptions(), nativeForm.getDropdown('Prov1').getOptions(), 'second actual original bureau dropdown retains its complete original option set');
  check.ok(render(native.bytes, 1).equals(render(nativePair.bytes, native.page_count + 2)), 'second actual bureau form preserves original artwork and filled appearances after resource grafting');
  const originalFonts = (await lib.PDFDocument.load(native.bytes)).getForm().acroForm.dict.lookup(n('DR'), lib.PDFDict).lookup(n('Font'), lib.PDFDict).keys().map(key => key.decodeText());
  const finalFonts = pairForm.acroForm.dict.lookup(n('DR'), lib.PDFDict).lookup(n('Font'), lib.PDFDict).keys().map(key => key.decodeText());
  check.ok(originalFonts.every(key => finalFonts.includes(key)) && finalFonts.includes('CRPLetterFont'), 'editable letter font has a separate resource name and leaves original bureau fonts available');
  await encryptedEvidenceChecks(check, form);
  if (t?.dataDir) for (const [filename, bytes] of [['inline-editable-packet.pdf', packet.bytes], ['inline-edited-packet.pdf', saved], ['inline-long-letter.pdf', long.bytes], ['inline-original-tu.pdf', nativePacket.bytes]]) fs.writeFileSync(path.join(t.dataDir, filename), bytes);
  return { single_complete_pdf: true, original_native_controls: true, source_pages_only: true, editable_letter: true, deterministic_approval_bytes: true, independent_print_rendering: true };
}
module.exports = { run, id: 'ew-inline-packet-composer', title: 'One editable letter and original forms with exact inline evidence/document copies' };
