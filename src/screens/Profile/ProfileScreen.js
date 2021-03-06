import React, { Component } from 'react';
import {
    View, Image, Text, Button, AsyncStorage,
    ActivityIndicator, TouchableOpacity, FlatList,
    ListView
} from 'react-native';
import { LinearGradient } from 'expo';
import { NavigationEvents } from 'react-navigation';

import SearchResultTicketButton from 'library/components/SearchResultTicketButton';
import GradientBackground from 'library/components/GradientBackground';
import Loader from 'library/components/Loader';

import StreamingFactory from 'library/factories/StreamingFactory';
import constants from 'utils/constants';
import colors from 'res/colors';
import styles from './styles';

export default class ProfileScreen extends Component {
    static navigationOptions = {
        headerBackground: (
            <LinearGradient
              colors={[colors.black, colors.navyblue]}
              style={{ flex: 1, opacity: 0.85 }}
              start={[1, 0]}
              end={[0, 1]}
            />
        ),
        headerTitle: 'Profile',
        headerTitleStyle: { flex: 1, color: 'white', textAlign: 'center' }
      };

    constructor(props) {
        super(props);

        this.state = {isLoading: true, pastPlaylists: [], recommendations: []};

        this._isMounted = false;
    }

    componentWillMount() {
        this._isMounted = true;
    }

    componentWillUnmount() {
        this._isMounted = false;
    }

    componentDidMount() {
        this.loadThings();
    }

    // Loads the necessary data from local storage
    loadThings = async () => {
        this.getPastPlaylists()
        .then(() => {
            if(this.state.pastPlaylists.length > 0)
                this.getArtistRecommendations();
        })
        .then(() => {
            if(this._isMounted)
                this.setState({isLoading: false});
        })
    }

    // Limits the number of times a user will receive band
    // recommendations by checking to see if it has been
    // more than 24 hours
    hasBeenLongerThanADay = async () => {
        var result = false;
        let time = await AsyncStorage.getItem('artistRecsTimeStamp');
        console.log('artistRecsTimeStamp: ' + time);
        if(time != null) {
            let timeNow = Date.now() / 1000; // seconds since UNIX epoch
            console.log('timeNow: ' + timeNow);
            console.log('timeNow - timeSaved: ' + (timeNow - (parseInt(time)/1000)));
            if((timeNow - (parseInt(time)/1000)) < 3600) { // (60 secs)*(60 mins)
                result = false;
            } else {
                result = true;
            }
        } else {
            result = true;
        }
        console.log(result);
        return result;
    }

    // Gets artist recommendations for a user once per day
    getArtistRecommendations = async () => {
        // Get 3 artist suggestions based on 3 recent playlists
        // Generate random index number, add that artist to list to render
        // Add time stamp to storage to only do once per day
        let hasBeenLongerThanADay = await this.hasBeenLongerThanADay();

        if(hasBeenLongerThanADay) {
            // Generate new recs
            let factory = new StreamingFactory(this.prefService);
            let serviceType = factory.createService();
            let artistNames = [];
            // Get 3 most recent playlists
            var i = 0;
            while(i < this.state.pastPlaylists.length && i < 3) {
                artistNames.push(this.state.pastPlaylists[i].artist.name);
                i++;
            }
            console.log('artistNames: ' + artistNames);
            // Get related artists
            // [{name: artistName, genre: genre}]
            let recommendations = await serviceType.getRecommendations(artistNames);
            console.log('recommendations: ' + recommendations);
            // Get 3 random artists
            let actualRecs = [];
            for(let j = 0; j < 3; j++) {
                let rand = Math.floor(Math.random() * recommendations.length);
                actualRecs.push(recommendations[rand]);
                recommendations.splice(rand, 1);
            }
            if(actualRecs.length > 0) {
                // Save timestamp and artist recommendations to storage
                AsyncStorage.setItem('artistRecsTimeStamp', (Date.now()).toString());
                AsyncStorage.setItem('pastArtistRecommendations', JSON.stringify(actualRecs));
                if(this._isMounted)
                    this.setState({recommendations: actualRecs});
            }
        } else {
            // use past recs
            let pastRecs = await AsyncStorage.getItem('pastArtistRecommendations');
            if(this._isMounted)
                this.setState({recommendations: JSON.parse(pastRecs)});
        }
    }

    // Gets playlists made from local storage
    getPastPlaylists = async () => {
        this.prefService = await AsyncStorage.getItem(constants.local_streaming_service);
        let p = await AsyncStorage.getItem(constants.pastPlaylists);
        if(p != null) {
            if(this._isMounted)
                this.setState({pastPlaylists: JSON.parse(p)});
        }
    }

    // Logs the user out and sends them to the login screen
    logout = async () => {
        AsyncStorage.setItem(constants.isLoggedIn, 'false');
        this.props.navigation.navigate('Initial');
    }

    render() {
        const {navigate} = this.props.navigation;
        if(this.state.isLoading) {
            return (
                <GradientBackground colors={[colors.pink, colors.navyblue]}>
                    <Loader />
                </GradientBackground>
            )
        }

        if(this.state.pastPlaylists.length == 0) {
            return (
                <View style={styles.rootContainer}>
                    <NavigationEvents
                        onWillFocus={payload => this.loadThings()} />
                    <GradientBackground colors={[colors.pink, colors.navyblue]}>
                        <View style={styles.textContainer}>
                            <Text style={styles.centeredText}>You have not made any playlists yet!
                                Search for an artist to begin making playlists.
                            </Text>
                        </View>
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                onPress={this.logout}
                                style={styles.logoutButton}>
                                <LinearGradient
                                    colors={[colors.red, colors.pink]}
                                    style={styles.buttonGradient}
                                    start={[1, 0]}
                                    end={[0, 1]}>
                                    <Text style={styles.btnText}>Logout</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </GradientBackground>
                </View>
            )
        }

        return (
            <View style={styles.rootContainer}>
                <NavigationEvents
                    onWillFocus={payload => this.loadThings()} />
                <GradientBackground colors={[colors.pink, colors.navyblue]}>
                    <View style={styles.recentPlaylistsContainer}>
                        <Text style={styles.centeredText}>Your most recent playlists</Text>
                        {this._renderRecentPlaylists()}
                    </View>

                    <View style={styles.suggestionsContainer}>
                        <Text style={styles.centeredText}>Artist recommendations</Text>
                        <View style={styles.suggestions}>
                            {this._renderArtistSuggestions()}
                        </View>
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            onPress={this.logout}
                            style={styles.logoutButton}>
                            <LinearGradient
                                colors={[colors.red, colors.pink]}
                                style={styles.buttonGradient}
                                start={[1, 0]}
                                end={[0, 1]}>
                                <Text style={styles.btnText}>Logout</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </GradientBackground>
            </View>
        );
    }

    // Renders past playlists
    _renderRecentPlaylists() {
        let playlists = []
        let pastPlaylists = this.state.pastPlaylists;
        var i = 0;
        while(i < pastPlaylists.length && i < 3) {
            playlists.push(
                <View
                    key={'ticektView-' + i}
                    style={styles.ticket}>
                    <SearchResultTicketButton
                        key={'playlist-' + i}
                        data={pastPlaylists[i]} />
                </View>
            );
            i++;
        }
        return playlists;
    }

    // Renders  3 artist recommendations
    _renderArtistSuggestions() {
        let recommendations = this.state.recommendations;
        if(recommendations.length < 3)
            return [];
        let recs = [];
        recs.push(
            <View key={'sug-' + 0} style={styles.suggestionBox}>
                <Text key={'name-' + 0}
                    style={[styles.suggestionText, styles.artistName]}
                    numberOfLines={2}>
                    {recommendations[0].name}
                </Text>
                <Text key={'genre-' + 0}
                    style={styles.suggestionText}
                    numberOfLines={2}>
                    {recommendations[0].genre}
                </Text>
            </View>
        );
        recs.push(
            <View key={'sug-' + 1} style={styles.suggestionBox}>
                <Text key={'name-' + 1}
                    style={[styles.suggestionText, styles.artistName]}
                    numberOfLines={2}>
                    {recommendations[1].name}
                </Text>
                <Text key={'genre-' + 1}
                    style={styles.suggestionText}
                    numberOfLines={2}>
                    {recommendations[1].genre}
                </Text>
            </View>
        );
        recs.push(
            <View key={'sug-' + 2} style={styles.suggestionBox}>
                <Text key={'name-' + 2}
                    style={[styles.suggestionText, styles.artistName]}
                    numberOfLines={2}>
                    {recommendations[2].name}
                </Text>
                <Text key={'genre-' + 2}
                    style={styles.suggestionText}
                    numberOfLines={2}>
                    {recommendations[2].genre}
                </Text>
            </View>
        );
        return recs;
    }
}
