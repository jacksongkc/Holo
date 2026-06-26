package totp

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"math"
	"net/url"
	"strings"
	"time"
)

func GenerateSecret() (string, error) {
	secret := make([]byte, 20)
	_, err := rand.Read(secret)
	if err != nil {
		return "", err
	}
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(secret), nil
}

func GenerateCode(secret string, timestamp time.Time) (string, error) {
	key, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(strings.ToUpper(secret))
	if err != nil {
		return "", err
	}

	counter := uint64(math.Floor(float64(timestamp.Unix()) / 30))

	var buf [8]byte
	binary.BigEndian.PutUint64(buf[:], counter)

	h := hmac.New(sha1.New, key)
	h.Write(buf[:])
	hash := h.Sum(nil)

	offset := hash[len(hash)-1] & 0x0f
	code := binary.BigEndian.Uint32(hash[offset:offset+4]) & 0x7fffffff
	code = code % 1000000

	return fmt.Sprintf("%06d", code), nil
}

func VerifyCode(secret, code string) bool {
	now := time.Now()
	for i := -1; i <= 1; i++ {
		t := now.Add(time.Duration(i) * 30 * time.Second)
		generated, err := GenerateCode(secret, t)
		if err != nil {
			continue
		}
		if generated == code {
			return true
		}
	}
	return false
}

func GenerateQRCodeURL(secret, issuer, accountName string) string {
	label := fmt.Sprintf("%s:%s", issuer, accountName)
	params := url.Values{}
	params.Set("secret", secret)
	params.Set("issuer", issuer)
	otpURL := fmt.Sprintf("otpauth://totp/%s?%s", url.PathEscape(label), params.Encode())

	qrParams := url.Values{}
	qrParams.Set("data", otpURL)
	qrParams.Set("size", "200x200")
	qrParams.Set("margin", "1")
	return fmt.Sprintf("https://api.qrserver.com/v1/create-qr-code/?%s", qrParams.Encode())
}
