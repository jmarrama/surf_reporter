package main

import (
	"net/smtp"
	"fmt"
	"flag"
	"errors"
	"io/ioutil"
	"strings"
)

type authdata struct {
	username, password, authhost, sendhost string
}

var authFile = flag.String("auth", "config/auth", "Location of four line auth file specifying agent email, password, authserver, and smtp server")
var emailsFile = flag.String("emails", "config/emails", "Location of file containing email addresses to send to")

func main () {

	flag.Parse()

	// read auth info from config file
	authinfo, err := loadAuthFile()
	if err != nil {
		fmt.Println(err)
		return
	}

	// read emails from config file
	emails, eerr := loadEmailFile()
	if eerr != nil {
		fmt.Println(eerr)
		return
	}


	fmt.Println("hello world!")
	fmt.Println(authinfo.username)
	fmt.Println(authinfo.password)

	auth := smtp.PlainAuth("", authinfo.username, authinfo.password, authinfo.authhost)
	err = smtp.SendMail(authinfo.sendhost, auth, authinfo.username, emails, []byte("this is a sweet mail test"))
	fmt.Println(err)
}

/*
 * Parses an authentication file used to authenticate a user, which is of the following format:
 * name@example.com
 * password
 * <url of server used for authenticating name@example.com>
 * <url of smtp server>
 * For gmail, this would look like:
 * name@gmail.com
 * password
 * smtp.gmail.com
 * smtp.gmail.com:587
 */
func loadAuthFile() (authdata, error) {
	var authinfo authdata

	rawfile, err := ioutil.ReadFile(*authFile)
	if err != nil {
		return authinfo, errors.New("Could not open auth file!")
	}

	// a little unsafe, but this file is small. yolo
	lines := strings.Split(strings.Trim(string(rawfile), "\r\n"), "\n")
	if len(lines) != 4 {
		fmt.Println(len(lines))
		return authinfo, errors.New("Auth file did not contain 4 lines!")
	}
	authinfo.username = lines[0];
	authinfo.password = lines[1];
	authinfo.authhost = lines[2];
	authinfo.sendhost = lines[3];
	return authinfo, nil
}

/*
 * Load a file containing one email address per line
 */
func loadEmailFile() ([]string, error) {
	rawfile, err := ioutil.ReadFile(*emailsFile)
	if err != nil {
		fmt.Println(err)
		return nil, errors.New("Could not open email file!")
	}

	return strings.Split(strings.Trim(string(rawfile), "\r\n"), "\n"), nil
}
