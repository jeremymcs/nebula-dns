// Nebula DNS / Flux Shield — Redis threat & category set keys (must match API writers).

package cache

const (
	threatSetPrefix   = "nebula:threats:"
	categorySetPrefix = "nebula:categories:"
)

var threatCategoryOrder = []string{
	"ransomware",
	"c2",
	"botnet",
	"malware",
	"phishing",
	"cryptomining",
	"dga",
	"spam",
}

var contentCategoryOrder = []string{
	"malware",
	"phishing",
	"c2",
	"adult",
	"gambling",
	"social_media",
	"streaming",
	"gaming",
	"advertising",
	"drugs",
	"weapons",
	"hate",
	"violence",
	"piracy",
	"vpn_proxy",
	"cryptocurrency",
	"dating",
	"forums",
	"news",
	"shopping",
}

func threatSetKey(category string) string {
	return threatSetPrefix + category
}

func categorySetKey(category string) string {
	return categorySetPrefix + category
}
