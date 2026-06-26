package ipwhitelist

import (
	"net"
	"strings"
)

func IsIPAllowed(ip string, whitelist []string) bool {
	if len(whitelist) == 0 {
		return true
	}

	ipAddr := net.ParseIP(ip)
	if ipAddr == nil {
		return false
	}

	if ipAddr.IsLoopback() {
		return true
	}

	for _, rule := range whitelist {
		rule = strings.TrimSpace(rule)
		if rule == "" {
			continue
		}

		if strings.Contains(rule, "/") {
			_, cidr, err := net.ParseCIDR(rule)
			if err == nil && cidr.Contains(ipAddr) {
				return true
			}
		} else {
			if ipAddr.Equal(net.ParseIP(rule)) {
				return true
			}
		}
	}

	return false
}